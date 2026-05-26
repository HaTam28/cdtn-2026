package hoshimoto.cdtn.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import hoshimoto.cdtn.dto.InventoryAuditDetailResponse;
import hoshimoto.cdtn.dto.InventoryAuditResponse;
import hoshimoto.cdtn.dto.request.InventoryAuditDetailRequest;
import hoshimoto.cdtn.dto.request.InventoryAuditRequest;
import hoshimoto.cdtn.dto.request.RejectRequest;
import hoshimoto.cdtn.entity.Enum.DocStatus;
import hoshimoto.cdtn.entity.Enum.NotificationTargetType;
import hoshimoto.cdtn.entity.Enum.NotificationType;
import hoshimoto.cdtn.entity.Enum.Role;
import hoshimoto.cdtn.entity.InventoryAudit;
import hoshimoto.cdtn.entity.InventoryAuditDetail;
import hoshimoto.cdtn.entity.InventoryBalance;
import hoshimoto.cdtn.entity.Item;
import hoshimoto.cdtn.entity.User;
import hoshimoto.cdtn.repository.InventoryAuditDetailRepository;
import hoshimoto.cdtn.repository.InventoryAuditRepository;
import hoshimoto.cdtn.repository.InventoryBalanceRepository;
import hoshimoto.cdtn.repository.ItemRepository;
import hoshimoto.cdtn.repository.UserRepository;

@Service
public class InventoryAuditService {

    @Autowired private InventoryAuditRepository auditRepository;
    @Autowired private InventoryAuditDetailRepository detailRepository;
    @Autowired private ItemRepository itemRepository;
    @Autowired private InventoryBalanceRepository inventoryBalanceRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private NotificationService notificationService;

    // ───────────────────────── CRUD ─────────────────────────

    public List<InventoryAuditResponse> getAll() {
        return auditRepository.findAllByOrderByCreatedAtDesc()
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    public InventoryAuditResponse getById(Long id) {
        return toResponse(findOrThrow(id));
    }

    /**
     * Tạo phiếu kiểm kê nháp.
     * Hệ thống tự lấy bookquantity từ InventoryBalance (tổng kho).
    * FE cung cấp actualquantity khi nhập kết quả kiểm kê.
     * diffquantity = actualquantity - bookquantity được tính tự động.
     */
    @Transactional
    public InventoryAuditResponse createDraft(InventoryAuditRequest request) {
        InventoryAudit audit = new InventoryAudit();
        applyHeader(audit, request);
        if (audit.getDocno() == null || audit.getDocno().isBlank()) {
            audit.setDocno(generateNextDocno("PKK-", auditRepository.findDocnosByPrefix("PKK-")));
        } else if (auditRepository.findByDocno(audit.getDocno()).isPresent()) {
            throw new RuntimeException("Mã phiếu '" + audit.getDocno() + "' đã tồn tại");
        }

        Long assignedUserId = request.getAssignedUserId();
        boolean sendToStaff = assignedUserId != null && Boolean.TRUE.equals(request.getSendToStaff());

        // Prevent Manager from doing "self-check" by creating a draft with actual quantities.
        // Managers should assign to staff (sendToStaff = true) and review/confirm after staff submits.
        var optUser = getCurrentUser();
        if (optUser.isPresent()) {
            var current = optUser.get();
            if (current.getRole() == Role.MANAGER && !sendToStaff && request.getDetails() != null) {
                // If manager attempts to create draft with actual quantities, block it
                boolean hasActual = request.getDetails().stream().anyMatch(d -> d.getActualquantity() != null);
                if (hasActual) {
                    throw new RuntimeException("Managers must assign audit tasks to staff. To perform checks, assign to staff and review results after they submit.");
                }
            }
        }

        if (sendToStaff) {
            Long nonNullAssignedUserId = Objects.requireNonNull(assignedUserId, "assignedUserId không được để trống");
            // set assigned user
            User assigned = userRepository.findById(nonNullAssignedUserId)
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy user được giao id: " + request.getAssignedUserId()));
            audit.setAssignedUser(assigned);
            audit.setDocstatus(DocStatus.REQUESTED);
        } else {
            requireActualQuantity(request.getDetails(), "Vui lòng nhập số lượng thực tế khi không gửi yêu cầu cho nhân viên");
            audit.setDocstatus(DocStatus.DRAFT);
        }

        audit = auditRepository.save(audit);
        notifyAssignedStaff(audit);

        saveDetails(audit, request.getDetails());
        return toResponse(audit);
    }

    /**
     * Cập nhật phiếu kiểm kê nháp (chỉ được sửa khi trạng thái DRAFT).
     */
    @Transactional
    public InventoryAuditResponse updateDraft(Long id, InventoryAuditRequest request) {
        InventoryAudit audit = findOrThrow(id);
        requireStatus(audit, DocStatus.DRAFT, "Chỉ có thể sửa phiếu ở trạng thái DRAFT");

        requireActualQuantity(request.getDetails(), "Vui lòng nhập số lượng thực tế khi cập nhật phiếu DRAFT");

        applyHeader(audit, request);
        audit.setModifiedAt(LocalDateTime.now());
        audit = auditRepository.save(audit);

        detailRepository.deleteByInventoryAuditId(id);
        saveDetails(audit, request.getDetails());
        return toResponse(audit);
    }

    /**
     * Lấy danh sách yêu cầu được giao cho user đang đăng nhập (trạng thái REQUESTED)
     */
    public List<InventoryAuditResponse> getAssignedForCurrentUser() {
        var optUser = getCurrentUser();
        if (optUser.isEmpty()) return java.util.List.of();
        User u = optUser.get();
        return auditRepository.findByAssignedUserIdAndDocstatusInOrderByCreatedAtDesc(
            u.getId(), List.of(DocStatus.REQUESTED, DocStatus.IN_PROGRESS))
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    public List<InventoryAuditResponse> getAssignedPendingForCurrentUser() {
        return getAssignedForCurrentUser();
    }

    public List<InventoryAuditResponse> getAssignedDoneForCurrentUser() {
        var optUser = getCurrentUser();
        if (optUser.isEmpty()) return java.util.List.of();
        User u = optUser.get();
        return auditRepository.findByAssignedUserIdAndDocstatusInOrderByCreatedAtDesc(
            u.getId(), List.of(
                DocStatus.SUBMITTED,
                DocStatus.PENDING_PROCESS,
                DocStatus.PROCESSED,
                DocStatus.CONFIRMED,
                DocStatus.CANCELLED))
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    /**
        * Nhân viên cập nhật chi tiết cho phiếu được giao (REQUESTED/IN_PROGRESS và là người được giao).
     */
    @Transactional
    public InventoryAuditResponse updateByAssignedStaff(Long id, InventoryAuditRequest request) {
        InventoryAudit audit = findOrThrow(id);
        if (audit.getDocstatus() != DocStatus.REQUESTED && audit.getDocstatus() != DocStatus.IN_PROGRESS) {
            throw new RuntimeException("Chỉ có thể cập nhật phiếu khi ở trạng thái REQUESTED hoặc IN_PROGRESS");
        }
        var optUser = getCurrentUser();
        if (optUser.isEmpty() || audit.getAssignedUser() == null || !audit.getAssignedUser().getId().equals(optUser.get().getId())) {
            throw new RuntimeException("Bạn không có quyền cập nhật phiếu này");
        }

        requireActualQuantity(request.getDetails(), "Vui lòng nhập số lượng thực tế trước khi gửi kết quả");

        applyHeader(audit, request);
        if (audit.getDocstatus() == DocStatus.REQUESTED) {
            audit.setDocstatus(DocStatus.IN_PROGRESS);
        }
        audit.setModifiedAt(LocalDateTime.now());
        audit = auditRepository.save(audit);

        detailRepository.deleteByInventoryAuditId(id);
        saveDetails(audit, request.getDetails());
        return toResponse(audit);
    }

    /**
     * Nhân viên gửi kết quả kiểm kê cho quản lý (chuyển trạng thái sang SUBMITTED)
     */
    @Transactional
    public InventoryAuditResponse submitFromStaff(Long id) {
        InventoryAudit audit = findOrThrow(id);
        if (audit.getDocstatus() != DocStatus.REQUESTED && audit.getDocstatus() != DocStatus.IN_PROGRESS) {
            throw new RuntimeException("Chỉ có thể gửi phiếu khi ở trạng thái REQUESTED hoặc IN_PROGRESS");
        }
        var optUser = getCurrentUser();
        if (optUser.isEmpty() || audit.getAssignedUser() == null || !audit.getAssignedUser().getId().equals(optUser.get().getId())) {
            throw new RuntimeException("Bạn không có quyền gửi phiếu này");
        }
        List<InventoryAuditDetail> details = detailRepository.findByInventoryAuditId(id);
        if (details == null || details.isEmpty()) {
            throw new RuntimeException("Phiếu kiểm kê không có dòng chi tiết nào");
        }
        boolean hasDiff = false;
        for (InventoryAuditDetail detail : details) {
            BigDecimal diff = detail.getDiffquantity();
            if (diff == null) {
                throw new RuntimeException("Chưa nhập số lượng thực tế cho hàng hóa '" + detail.getItem().getItemcode() + "'");
            }
            if (diff.compareTo(BigDecimal.ZERO) != 0) {
                hasDiff = true;
                break;
            }
        }
        audit.setDocstatus(hasDiff ? DocStatus.PENDING_PROCESS : DocStatus.SUBMITTED);
        audit.setModifiedAt(LocalDateTime.now());
        getCurrentUser().ifPresent(u -> audit.setModifiedBy(u.getUsername()));
        auditRepository.save(audit);
        notifyManagersAuditSubmitted(audit);
        return toResponse(audit);
    }

    /**
     * Xác nhận phiếu kiểm kê.
    * Áp dụng diffquantity vào InventoryBalance để điều chỉnh tồn kho.
     * diff > 0: thừa hàng → tăng tồn; diff < 0: thiếu hàng → giảm tồn; diff = 0: không đổi.
     */
    @Transactional
    public InventoryAuditResponse confirm(Long id) {
        InventoryAudit audit = findOrThrow(id);
        // Manager có thể xác nhận phiếu ở trạng thái DRAFT, SUBMITTED hoặc PENDING_PROCESS
        if (audit.getDocstatus() != DocStatus.DRAFT
                && audit.getDocstatus() != DocStatus.SUBMITTED
                && audit.getDocstatus() != DocStatus.PENDING_PROCESS) {
            throw new RuntimeException("Chỉ có thể xác nhận phiếu ở trạng thái DRAFT, SUBMITTED hoặc PENDING_PROCESS");
        }

        List<InventoryAuditDetail> details = detailRepository.findByInventoryAuditId(id);
        if (details == null || details.isEmpty()) {
            throw new RuntimeException("Phiếu kiểm kê không có dòng chi tiết nào");
        }

        boolean hasDiff = false;
        for (InventoryAuditDetail detail : details) {
            BigDecimal diff = detail.getDiffquantity();
            Item item = detail.getItem();
            if (diff == null) {
                throw new RuntimeException("Chưa nhập số lượng thực tế cho hàng hóa '" + item.getItemcode() + "'");
            }
            if (diff.compareTo(BigDecimal.ZERO) == 0) continue;
            hasDiff = true;

            // ── Cập nhật InventoryBalance ──────────────────────────────
            InventoryBalance balance = inventoryBalanceRepository
                    .findByItemId(item.getId())
                    .orElseGet(() -> {
                        InventoryBalance b = new InventoryBalance();
                        b.setItemId(item.getId());
                        b.setQuantity(BigDecimal.ZERO);
                        return b;
                    });

            BigDecimal newBalQty = balance.getQuantity().add(diff);
            if (newBalQty.compareTo(BigDecimal.ZERO) < 0) {
                throw new RuntimeException(
                    "Tồn kho tổng của '" + item.getItemcode() + "' không đủ sau kiểm kê "
                    + "(tổng: " + balance.getQuantity() + ", chênh lệch: " + diff + ")");
            }
            balance.setQuantity(newBalQty);
            balance.setLastUpdated(LocalDateTime.now());
            inventoryBalanceRepository.save(balance);
        }

        audit.setDocstatus(hasDiff ? DocStatus.PROCESSED : DocStatus.CONFIRMED);
        audit.setModifiedAt(LocalDateTime.now());
        getCurrentUser().ifPresent(u -> {
            audit.setApprover(u);
            audit.setModifiedBy(u.getUsername());
        });
        auditRepository.save(audit);
        notifyStaffAuditApproved(audit);
        return toResponse(audit);
    }

    /**
     * Từ chối duyệt phiếu kiểm kê (SUBMITTED hoặc PENDING_PROCESS → REJECTED).
     * Manager cung cấp lý do từ chối; nhân viên được thông báo.
     */
    @Transactional
    public InventoryAuditResponse reject(Long id, RejectRequest request) {
        InventoryAudit audit = findOrThrow(id);
        if (audit.getDocstatus() != DocStatus.SUBMITTED && audit.getDocstatus() != DocStatus.PENDING_PROCESS) {
            throw new RuntimeException("Chỉ có thể từ chối phiếu ở trạng thái SUBMITTED hoặc PENDING_PROCESS");
        }
        audit.setDocstatus(DocStatus.REJECTED);
        audit.setRejectReason(request.getReason());
        audit.setModifiedAt(LocalDateTime.now());
        getCurrentUser().ifPresent(u -> {
            audit.setApprover(u);
            audit.setModifiedBy(u.getUsername());
        });
        auditRepository.save(audit);
        notifyStaffAuditRejected(audit);
        return toResponse(audit);
    }

    /**
     * Hủy phiếu kiểm kê (chỉ DRAFT mới hủy được).
     */
    @Transactional
    public InventoryAuditResponse cancel(Long id) {
        InventoryAudit audit = findOrThrow(id);
        requireStatus(audit, DocStatus.DRAFT, "Chỉ có thể hủy phiếu ở trạng thái DRAFT");
        audit.setDocstatus(DocStatus.CANCELLED);
        audit.setModifiedAt(LocalDateTime.now());
        getCurrentUser().ifPresent(u -> audit.setModifiedBy(u.getUsername()));
        auditRepository.save(audit);
        return toResponse(audit);
    }

    // ───────────────────────── PRIVATE HELPERS ─────────────────────────

    private void applyHeader(InventoryAudit audit, InventoryAuditRequest request) {
        String docno = request.getDocno();
        if (docno != null && !docno.isBlank()) {
            audit.setDocno(docno.trim());
        }
        audit.setDocDate(request.getDocDate());
        audit.setDescription(request.getDescription());
        if (audit.getUser() == null) {
            getCurrentUser().ifPresent(u -> {
                audit.setUser(u);
                audit.setCreatedBy(u.getUsername());
            });
        }
    }

    private void notifyAssignedStaff(InventoryAudit audit) {
        User assigned = audit.getAssignedUser();
        if (assigned == null) return;
        String docno = audit.getDocno();
        notificationService.notifyUser(
                assigned,
                NotificationType.ASSIGNED,
                NotificationTargetType.INVENTORY_AUDIT,
                audit.getId(),
                docno,
                "Yeu cau kiem ke",
                "Ban duoc giao kiem ke phieu " + docno
        );
    }

    private void notifyManagersAuditSubmitted(InventoryAudit audit) {
        User requester = audit.getUser();
        if (requester == null) return;
        String docno = audit.getDocno();
        notificationService.notifyUser(
            requester,
                NotificationType.APPROVAL_REQUIRED,
                NotificationTargetType.INVENTORY_AUDIT,
                audit.getId(),
                docno,
                "Phieu kiem ke can duyet",
                "Phieu kiem ke " + docno + " can duyet"
        );
    }

    private void notifyStaffAuditRejected(InventoryAudit audit) {
        User assigned = audit.getAssignedUser();
        User recipient = assigned != null ? assigned : audit.getUser();
        if (recipient == null) return;
        String docno = audit.getDocno();
        notificationService.notifyUser(
                recipient,
                NotificationType.REJECTED,
                NotificationTargetType.INVENTORY_AUDIT,
                audit.getId(),
                docno,
                "Phieu kiem ke bi tu choi",
                "Phieu kiem ke " + docno + " bi tu choi: " + audit.getRejectReason()
        );
    }

    private void notifyStaffAuditApproved(InventoryAudit audit) {
        User assigned = audit.getAssignedUser();
        User recipient = assigned != null ? assigned : audit.getUser();
        if (recipient == null) return;
        String docno = audit.getDocno();
        notificationService.notifyUser(
                recipient,
                NotificationType.APPROVED,
                NotificationTargetType.INVENTORY_AUDIT,
                audit.getId(),
                docno,
                "Phieu kiem ke da duyet",
                "Phieu kiem ke " + docno + " da duyet"
        );
    }

    private void saveDetails(InventoryAudit audit, List<InventoryAuditDetailRequest> detailRequests) {
        if (detailRequests == null) return;
        for (InventoryAuditDetailRequest req : detailRequests) {
            Long itemId = Objects.requireNonNull(req.getItemId(), "itemId không được để trống");
            Item item = itemRepository.findById(itemId)
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy hàng hóa id: " + req.getItemId()));

            // Lấy bookquantity từ InventoryBalance (tổng kho)
            BigDecimal bookQty = inventoryBalanceRepository.findByItemId(item.getId())
                    .map(InventoryBalance::getQuantity)
                    .orElse(BigDecimal.ZERO);

            BigDecimal actualQty = req.getActualquantity();
            BigDecimal diffQty = actualQty != null ? actualQty.subtract(bookQty) : null;

            InventoryAuditDetail detail = new InventoryAuditDetail();
            detail.setInventoryAudit(audit);
            detail.setItem(item);
            detail.setUnitof(item.getUnitof());
            detail.setBookquantity(bookQty);
            detail.setActualquantity(actualQty);
            detail.setDiffquantity(diffQty);
            detail.setDescription(req.getDescription());
            detailRepository.save(detail);
        }
    }

    private void requireActualQuantity(List<InventoryAuditDetailRequest> detailRequests, String message) {
        if (detailRequests == null || detailRequests.isEmpty()) {
            throw new RuntimeException(message);
        }
        for (InventoryAuditDetailRequest req : detailRequests) {
            if (req.getActualquantity() == null) {
                throw new RuntimeException(message);
            }
        }
    }

    private InventoryAudit findOrThrow(Long id) {
        Long auditId = Objects.requireNonNull(id, "id không được để trống");
        return auditRepository.findById(auditId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy phiếu kiểm kê id: " + id));
    }

    private void requireStatus(InventoryAudit audit, DocStatus required, String message) {
        if (audit.getDocstatus() != required) {
            throw new RuntimeException(message);
        }
    }

    private String generateNextDocno(String prefix, List<String> existingDocnos) {
        int max = existingDocnos.stream()
                .mapToInt(docno -> extractSequence(docno, prefix))
                .max()
                .orElse(0);
        int next = max + 1;
        return String.format("%s%02d", prefix, next);
    }

    private int extractSequence(String docno, String prefix) {
        if (docno == null || !docno.startsWith(prefix)) return -1;
        String numeric = docno.substring(prefix.length());
        if (!numeric.matches("\\d+")) return -1;
        return Integer.parseInt(numeric);
    }

    private java.util.Optional<User> getCurrentUser() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) return java.util.Optional.empty();
        return userRepository.findByUsername(auth.getName());
    }

    public InventoryAuditResponse toResponse(InventoryAudit audit) {
        InventoryAuditResponse res = new InventoryAuditResponse();
        res.setId(audit.getId());
        res.setDocno(audit.getDocno());
        res.setDocDate(audit.getDocDate());
        res.setDescription(audit.getDescription());
        res.setDocstatus(audit.getDocstatus());
        res.setCreatedAt(audit.getCreatedAt());
        res.setModifiedAt(audit.getModifiedAt());
        res.setModifiedBy(audit.getModifiedBy());
        res.setRejectReason(audit.getRejectReason());

        if (audit.getUser() != null) {
            res.setCreatedByUsername(audit.getUser().getUsername());
            res.setCreatedByFullname(audit.getUser().getFullname());
        }
        if (audit.getAssignedUser() != null) {
            res.setAssignedToUserId(audit.getAssignedUser().getId());
            res.setAssignedToUsername(audit.getAssignedUser().getUsername());
            res.setAssignedToFullname(audit.getAssignedUser().getFullname());
            res.setAuditorUserId(audit.getAssignedUser().getId());
            res.setAuditorUsername(audit.getAssignedUser().getUsername());
            res.setAuditorFullname(audit.getAssignedUser().getFullname());
        } else if (audit.getUser() != null) {
            res.setAuditorUserId(audit.getUser().getId());
            res.setAuditorUsername(audit.getUser().getUsername());
            res.setAuditorFullname(audit.getUser().getFullname());
        }

        if (audit.getApprover() != null) {
            res.setApproverUserId(audit.getApprover().getId());
            res.setApproverUsername(audit.getApprover().getUsername());
            res.setApproverFullname(audit.getApprover().getFullname());
        }

        List<InventoryAuditDetail> details = detailRepository.findByInventoryAuditId(audit.getId());
        res.setDetails(details.stream().map(d -> {
            InventoryAuditDetailResponse dr = new InventoryAuditDetailResponse();
            dr.setId(d.getId());
            if (d.getItem() != null) {
                dr.setItemId(d.getItem().getId());
                dr.setItemcode(d.getItem().getItemcode());
                dr.setItemname(d.getItem().getItemname());
                dr.setUnitof(d.getItem().getUnitof());
            }
            dr.setBookquantity(d.getBookquantity());
            dr.setActualquantity(d.getActualquantity());
            dr.setDiffquantity(d.getDiffquantity());
            dr.setDescription(d.getDescription());
            return dr;
        }).collect(Collectors.toList()));

        // expose whether an adjustment voucher has been created for this audit
        res.setAdjustmentCreated(audit.getAdjustmentCreated());
        // expose optional adjustment flags (JSON array of booleans)
        res.setAdjustmentFlags(audit.getAdjustmentFlags());

        return res;
    }
}
