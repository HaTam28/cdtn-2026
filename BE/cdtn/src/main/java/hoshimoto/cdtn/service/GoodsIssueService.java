package hoshimoto.cdtn.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import hoshimoto.cdtn.dto.GoodsIssueDetailResponse;
import hoshimoto.cdtn.dto.GoodsIssueResponse;
import hoshimoto.cdtn.dto.LocationDetailResponse;
import hoshimoto.cdtn.dto.LocationDetailResponse.LocationItemStock;
import hoshimoto.cdtn.dto.LocationSuggestionResponse;
import hoshimoto.cdtn.dto.request.GoodsIssueDetailRequest;
import hoshimoto.cdtn.dto.request.GoodsIssueRequest;
import hoshimoto.cdtn.entity.Batch;
import hoshimoto.cdtn.entity.Customer;
import hoshimoto.cdtn.entity.Enum.DocStatus;
import hoshimoto.cdtn.entity.Enum.NotificationTargetType;
import hoshimoto.cdtn.entity.Enum.NotificationType;
import hoshimoto.cdtn.entity.Enum.Role;
import hoshimoto.cdtn.entity.GoodsIssue;
import hoshimoto.cdtn.entity.GoodsIssueDetail;
import hoshimoto.cdtn.entity.InventoryBalance;
import hoshimoto.cdtn.entity.Item;
import hoshimoto.cdtn.entity.ItemLocation;
import hoshimoto.cdtn.entity.Location;
import hoshimoto.cdtn.entity.User;
import hoshimoto.cdtn.repository.BatchRepository;
import hoshimoto.cdtn.repository.CustomerRepository;
import hoshimoto.cdtn.repository.GoodsIssueDetailRepository;
import hoshimoto.cdtn.repository.GoodsIssueRepository;
import hoshimoto.cdtn.repository.InventoryAuditRepository;
import hoshimoto.cdtn.repository.InventoryBalanceRepository;
import hoshimoto.cdtn.repository.ItemLocationRepository;
import hoshimoto.cdtn.repository.ItemRepository;
import hoshimoto.cdtn.repository.LocationRepository;
import hoshimoto.cdtn.repository.UserRepository;

@Service
public class GoodsIssueService {

    @Autowired
    private GoodsIssueRepository issueRepository;
    @Autowired
    private GoodsIssueDetailRepository detailRepository;
    @Autowired
    private ItemRepository itemRepository;
    @Autowired
    private LocationRepository locationRepository;
    @Autowired
    private ItemLocationRepository itemLocationRepository;
    @Autowired
    private InventoryBalanceRepository inventoryBalanceRepository;
    @Autowired
    private CustomerRepository customerRepository;
    @Autowired
    private BatchRepository batchRepository;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private InventoryAuditRepository inventoryAuditRepository;
    @Autowired
    private NotificationService notificationService;

    // ───────────────────────── CRUD ─────────────────────────

    public List<GoodsIssueResponse> getAll() {
        return issueRepository.findAllByOrderByCreatedAtDesc()
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    public GoodsIssueResponse getById(Long id) {
        return toResponse(findOrThrow(id));
    }

    /**
     * Tạo phiếu xuất nháp (DRAFT).
     * FE gửi danh sách chi tiết kèm locationId đã chọn từ danh sách vị trí có hàng.
     */
    @Transactional
    public GoodsIssueResponse createDraft(GoodsIssueRequest request) {
        GoodsIssue issue = new GoodsIssue();
        applyHeader(issue, request);
        if (issue.getDocno() == null || issue.getDocno().isBlank()) {
            issue.setDocno(generateNextDocno("PX-", issueRepository.findDocnosByPrefix("PX-")));
        } else if (issueRepository.findByDocno(issue.getDocno()).isPresent()) {
            throw new RuntimeException("Mã phiếu '" + issue.getDocno() + "' đã tồn tại");
        }
        issue.setDocstatus(DocStatus.DRAFT);
        issue = issueRepository.save(issue);
        notifyManagersIfStaffCreated(issue);

        saveDetails(issue, request.getDetails());
        return toResponse(issue);
    }

    /**
     * Cập nhật phiếu xuất nháp.
     */
    @Transactional
    public GoodsIssueResponse updateDraft(Long id, GoodsIssueRequest request) {
        GoodsIssue issue = findOrThrow(id);
        requireStatus(issue, DocStatus.DRAFT, "Chỉ có thể sửa phiếu ở trạng thái DRAFT");

        applyHeader(issue, request);
        issue.setModifiedAt(LocalDateTime.now());
        issue = issueRepository.save(issue);

        detailRepository.deleteByGoodsIssueId(id);
        saveDetails(issue, request.getDetails());
        return toResponse(issue);
    }

    /**
     * Xác nhận phiếu xuất kho.
     * Trừ số lượng từ ItemLocation và InventoryBalance.
     */
    @Transactional
    public GoodsIssueResponse confirm(Long id) {
        GoodsIssue issue = findOrThrow(id);
        requireStatus(issue, DocStatus.DRAFT, "Chỉ có thể xác nhận phiếu ở trạng thái DRAFT");

        List<GoodsIssueDetail> details = detailRepository.findByGoodsIssueId(id);

        if (details == null || details.isEmpty()) {
            throw new RuntimeException("Phiếu xuất không có dòng chi tiết nào");
        }

        for (GoodsIssueDetail detail : details) {
            if (detail.getLocation() == null) {
                throw new RuntimeException(
                        "Dòng chi tiết với mã hàng '" + detail.getItemcode() + "' chưa được gán vị trí");
            }

            Item item = detail.getItem();
            Location location = detail.getLocation();
            BigDecimal qty = detail.getQuantity();

            // Kiểm tra & trừ ItemLocation
            ItemLocation il = itemLocationRepository
                    .findByItemIdAndLocationId(item.getId(), location.getId())
                    .orElseThrow(() -> new RuntimeException(
                            "Không tìm thấy tồn kho của '" + item.getItemcode()
                                    + "' tại vị trí '" + location.getLocationcode() + "'"));

            if (il.getQuantity().compareTo(qty) < 0) {
                throw new RuntimeException(
                        "Tồn kho tại vị trí '" + location.getLocationcode()
                                + "' không đủ số lượng để xuất (cần " + qty + ", hiện có " + il.getQuantity() + ")");
            }

            BigDecimal newQty = il.getQuantity().subtract(qty);
            il.setQuantity(newQty);
            if (newQty.compareTo(BigDecimal.ZERO) == 0) {
                il.setIsActive(false);
            }
            itemLocationRepository.save(il);

            // Cập nhật InventoryBalance
            InventoryBalance balance = inventoryBalanceRepository
                    .findByItemId(item.getId())
                    .orElseThrow(() -> new RuntimeException(
                            "Không tìm thấy tồn kho tổng của hàng hóa id: " + item.getId()));

            BigDecimal newBalance = balance.getQuantity().subtract(qty);
            if (newBalance.compareTo(BigDecimal.ZERO) < 0) {
                throw new RuntimeException(
                        "Tồn kho tổng của '" + item.getItemcode() + "' không đủ số lượng để xuất "
                                + "(cần " + qty + ", hiện có " + balance.getQuantity() + ")");
            }
            balance.setQuantity(newBalance);
            balance.setLastUpdated(LocalDateTime.now());
            inventoryBalanceRepository.save(balance);

            // Trừ quantityRemaining của lô hàng (nếu có liên kết)
            if (detail.getBatch() != null) {
                Batch batch = detail.getBatch();
                BigDecimal newRemaining = batch.getQuantityRemaining().subtract(qty);
                if (newRemaining.compareTo(BigDecimal.ZERO) < 0) {
                    throw new RuntimeException(
                            "Số lượng của lô '" + batch.getBatchCode() + "' không đủ để xuất "
                                    + "(cần " + qty + ", còn lại " + batch.getQuantityRemaining() + ")");
                }
                batch.setQuantityRemaining(newRemaining);
                batchRepository.save(batch);
            }
        }

        issue.setDocstatus(DocStatus.CONFIRMED);
        issue.setModifiedAt(LocalDateTime.now());
        getCurrentUser().ifPresent(u -> {
            issue.setApprover(u);
            issue.setModifiedBy(u.getUsername());
        });
        issueRepository.save(issue);
        notifyCreatorApproved(issue);
        return toResponse(issue);
    }

    /**
     * Hủy phiếu xuất (chỉ DRAFT mới hủy được).
     */
    @Transactional
    public GoodsIssueResponse cancel(Long id) {
        GoodsIssue issue = findOrThrow(id);
        requireStatus(issue, DocStatus.DRAFT, "Chỉ có thể hủy phiếu ở trạng thái DRAFT");
        issue.setDocstatus(DocStatus.CANCELLED);
        issue.setModifiedAt(LocalDateTime.now());
        getCurrentUser().ifPresent(u -> {
            issue.setApprover(u);
            issue.setModifiedBy(u.getUsername());
        });
        issueRepository.save(issue);
        return toResponse(issue);
    }

    // ───────────────────────── AVAILABLE LOCATIONS (XUẤT KHO)
    // ─────────────────────────

    /**
     * Liệt kê TẤT CẢ vị trí đang chứa itemId với quantity > 0 (không so sánh với
     * quantity cần xuất).
     * Mỗi vị trí kèm danh sách TẤT CẢ sản phẩm đang chứa tại đó (để FE thống kê).
     * Sắp xếp: tồn kho nhiều nhất trước → FE hiển thị checkbox, tích nhiều vị trí
     * khi cần.
     */
    public List<LocationDetailResponse> listAvailableForIssue(Long itemId) {
        List<ItemLocation> stockLocations = itemLocationRepository.findAllWithStockByItemId(itemId);
        List<LocationDetailResponse> result = new ArrayList<>();

        for (ItemLocation il : stockLocations) {
            Location loc = il.getLocation();
            BigDecimal used = itemLocationRepository.getTotalUsedCapacity(loc.getId());
            BigDecimal cap = loc.getCapacity() != null ? BigDecimal.valueOf(loc.getCapacity()) : null;
            BigDecimal remaining = cap != null ? cap.subtract(used) : null;

            // Lấy tất cả hàng tại vị trí này để thống kê
            List<ItemLocation> itemsAtLoc = itemLocationRepository.findByLocationIdAndIsActiveTrue(loc.getId());
            List<LocationItemStock> stockList = itemsAtLoc.stream().map(sil -> new LocationItemStock(
                    sil.getItem().getId(),
                    sil.getItem().getItemcode(),
                    sil.getItem().getItemname(),
                    sil.getItem().getUnitof(),
                    sil.getQuantity(),
                    batchRepository.findAllByReceiptDetailLocationIdAndItemId(loc.getId(), sil.getItem().getId())
                            .stream()
                            .map(Batch::getBatchCode).collect(Collectors.toList())))
                    .collect(Collectors.toList());

                List<String> itemCodes = itemsAtLoc.stream()
                    .map(sil -> sil.getItem().getItemcode())
                    .distinct()
                    .collect(Collectors.toList());

                result.add(new LocationDetailResponse(
                    loc.getId(), loc.getLocationcode(), loc.getLocationname(),
                    loc.getRackno(), loc.getFloorno(), loc.getColumnno(),
                    loc.getCapacity(), used, remaining, "HAS_STOCK", stockList, itemCodes));
        }

        // Sắp xếp: tồn kho của item này tại vị trí giảm dần
        result.sort((a, b) -> {
            BigDecimal stockA = a.getItems().stream()
                    .filter(s -> s.getItemId().equals(itemId))
                    .map(LocationItemStock::getQuantity)
                    .findFirst().orElse(BigDecimal.ZERO);
            BigDecimal stockB = b.getItems().stream()
                    .filter(s -> s.getItemId().equals(itemId))
                    .map(LocationItemStock::getQuantity)
                    .findFirst().orElse(BigDecimal.ZERO);
            return stockB.compareTo(stockA);
        });

        return result;
    }

    // ───────────────────────── AVAILABLE LOCATIONS (OLD) ─────────────────────────

    /**
     * Lấy danh sách vị trí đang chứa item với số lượng đủ để xuất.
     */
    public List<LocationSuggestionResponse> availableLocations(Long itemId, BigDecimal quantity) {
        return itemLocationRepository.findAvailableForIssue(itemId, quantity)
                .stream().map(il -> {
                    Location loc = il.getLocation();
                    return new LocationSuggestionResponse(
                            loc.getId(), loc.getLocationcode(), loc.getLocationname(),
                            loc.getCapacity(), il.getQuantity(), il.getQuantity(),
                            "HAS_STOCK", null);
                }).collect(Collectors.toList());
    }

    /**
     * Gợi ý phân bổ số lượng cần xuất qua nhiều vị trí (khi quantity > tồn tại một
     * vị trí).
     * Ưu tiên vị trí có tồn kho lớn nhất trước. Tự động tính suggestedQuantity cho
     * mỗi vị trí.
     */
    public List<LocationSuggestionResponse> suggestSplit(Long itemId, BigDecimal quantity) {
        // Lấy tất cả vị trí có hàng (dù chưa đủ quantity), sắp xếp theo tồn giảm dần
        List<ItemLocation> all = itemLocationRepository.findByItemIdAndIsActiveTrue(itemId);
        all.sort((a, b) -> b.getQuantity().compareTo(a.getQuantity()));

        List<LocationSuggestionResponse> result = new ArrayList<>();
        BigDecimal remaining = quantity;

        for (ItemLocation il : all) {
            if (remaining.compareTo(BigDecimal.ZERO) <= 0)
                break;
            BigDecimal stock = il.getQuantity();
            if (stock.compareTo(BigDecimal.ZERO) <= 0)
                continue;
            BigDecimal take = remaining.min(stock);
            Location loc = il.getLocation();
            LocationSuggestionResponse r = new LocationSuggestionResponse(
                    loc.getId(), loc.getLocationcode(), loc.getLocationname(),
                    loc.getCapacity(), stock, stock, "HAS_STOCK", take);
            result.add(r);
            remaining = remaining.subtract(take);
        }

        if (remaining.compareTo(BigDecimal.ZERO) > 0) {
            throw new RuntimeException(
                    "Tồn kho tổng không đủ số lượng cần xuất " + quantity + " (còn thiếu " + remaining + ")");
        }
        return result;
    }

    // ───────────────────────── PRIVATE HELPERS ─────────────────────────

    private void applyHeader(GoodsIssue issue, GoodsIssueRequest request) {
        String docno = request.getDocno();
        if (docno != null && !docno.isBlank()) {
            issue.setDocno(docno.trim());
        }
        issue.setDocDate(request.getDocDate());
        issue.setDescription(request.getDescription());
        if (request.getCustomerId() != null) {
            Customer customer = customerRepository.findById(request.getCustomerId())
                    .orElseThrow(
                            () -> new RuntimeException("Không tìm thấy khách hàng id: " + request.getCustomerId()));
            issue.setCustomer(customer);
            issue.setTaxcode(customer.getTaxcode());
        }
        if (request.getInventoryAuditId() != null) {
            issue.setInventoryAuditId(request.getInventoryAuditId());
            var optAudit = inventoryAuditRepository.findById(request.getInventoryAuditId());
            if (optAudit.isPresent()) {
                var audit = optAudit.get();
                audit.setAdjustmentCreated(true);
                if (request.getAdjustmentFlags() != null) {
                    audit.setAdjustmentFlags(request.getAdjustmentFlags());
                }
                inventoryAuditRepository.save(audit);
            }
        }
        // Gán người tạo từ JWT token (chỉ set khi tạo mới, không ghi đè khi update)
        if (issue.getUser() == null) {
            getCurrentUser().ifPresent(issue::setUser);
        }
    }

    private void notifyManagersIfStaffCreated(GoodsIssue issue) {
        User creator = issue.getUser();
        if (creator == null || creator.getRole() != Role.STAFF)
            return;
        String docno = issue.getDocno();
        notificationService.notifyManagers(
                NotificationType.APPROVAL_REQUIRED,
                NotificationTargetType.GOODS_ISSUE,
                issue.getId(),
                docno,
                "Phieu xuat can duyet",
                "Phieu xuat " + docno + " can duyet");
    }

    private void notifyCreatorApproved(GoodsIssue issue) {
        User creator = issue.getUser();
        if (creator == null || creator.getRole() != Role.STAFF)
            return;
        String docno = issue.getDocno();
        notificationService.notifyUser(
                creator,
                NotificationType.APPROVED,
                NotificationTargetType.GOODS_ISSUE,
                issue.getId(),
                docno,
                "Phieu xuat da duyet",
                "Phieu xuat " + docno + " da duyet");
    }

    private java.util.Optional<User> getCurrentUser() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated())
            return java.util.Optional.empty();
        String username = auth.getName();
        return userRepository.findByUsername(username);
    }

    private void saveDetails(GoodsIssue issue, List<GoodsIssueDetailRequest> detailRequests) {
        if (detailRequests == null)
            return;
        for (GoodsIssueDetailRequest req : detailRequests) {
            Item item = itemRepository.findById(req.getItemId())
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy hàng hóa id: " + req.getItemId()));

            GoodsIssueDetail detail = new GoodsIssueDetail();
            detail.setGoodsIssue(issue);
            detail.setItem(item);
            detail.setItemcode(item.getItemcode());
            detail.setItemname(item.getItemname());
            detail.setUnitof(item.getUnitof());
            detail.setQuantity(req.getQuantity());
            detail.setUnitprice(req.getUnitprice() != null ? req.getUnitprice() : BigDecimal.ZERO);
            detail.setAmount(detail.getQuantity().multiply(detail.getUnitprice()));

            if (req.getLocationId() != null) {
                Location location = locationRepository.findById(req.getLocationId())
                        .orElseThrow(() -> new RuntimeException("Không tìm thấy vị trí id: " + req.getLocationId()));
                detail.setLocation(location);
            }

            if (req.getBatchId() != null) {
                Batch batch = batchRepository.findById(req.getBatchId())
                        .orElseThrow(() -> new RuntimeException("Không tìm thấy lô hàng id: " + req.getBatchId()));
                detail.setBatch(batch);
            }

            detailRepository.save(detail);
        }
    }

    private GoodsIssue findOrThrow(Long id) {
        return issueRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy phiếu xuất id: " + id));
    }

    private void requireStatus(GoodsIssue issue, DocStatus required, String message) {
        if (issue.getDocstatus() != required) {
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
        if (docno == null || !docno.startsWith(prefix))
            return -1;
        String numeric = docno.substring(prefix.length());
        if (!numeric.matches("\\d+"))
            return -1;
        return Integer.parseInt(numeric);
    }

    public GoodsIssueResponse toResponse(GoodsIssue issue) {
        GoodsIssueResponse res = new GoodsIssueResponse();
        res.setId(issue.getId());
        res.setDocno(issue.getDocno());
        res.setDocDate(issue.getDocDate());
        res.setDescription(issue.getDescription());
        res.setDocstatus(issue.getDocstatus());
        res.setCreatedAt(issue.getCreatedAt());
        if (issue.getCustomer() != null) {
            res.setCustomerId(issue.getCustomer().getId());
            res.setCustomerName(issue.getCustomer().getCustomername());
            res.setCustomerTaxcode(issue.getCustomer().getTaxcode());
        }
        if (issue.getUser() != null) {
            res.setCreatedByUsername(issue.getUser().getUsername());
            res.setCreatedByFullname(issue.getUser().getFullname());
        } else {
            res.setCreatedByUsername(null);
            res.setCreatedByFullname(null);
        }
        if (issue.getApprover() != null) {
            res.setActionByUsername(issue.getApprover().getUsername());
            res.setActionByFullname(issue.getApprover().getFullname());
            res.setApprovedAt(issue.getModifiedAt());
        }
        List<GoodsIssueDetail> details = detailRepository.findByGoodsIssueId(issue.getId());
        res.setDetails(details.stream().map(d -> {
            GoodsIssueDetailResponse dr = new GoodsIssueDetailResponse();
            dr.setId(d.getId());
            if (d.getItem() != null) {
                dr.setItemId(d.getItem().getId());
                dr.setItemcode(d.getItem().getItemcode());
                dr.setItemname(d.getItem().getItemname());
                dr.setUnitof(d.getItem().getUnitof());
            }
            dr.setQuantity(d.getQuantity());
            dr.setUnitprice(d.getUnitprice());
            dr.setAmount(d.getAmount());
            if (d.getLocation() != null) {
                dr.setLocationId(d.getLocation().getId());
                dr.setLocationcode(d.getLocation().getLocationcode());
                dr.setLocationname(d.getLocation().getLocationname());
            }
            if (d.getBatch() != null) {
                dr.setBatchId(d.getBatch().getId());
                dr.setBatchCode(d.getBatch().getBatchCode());
            }
            return dr;
        }).collect(Collectors.toList()));
        res.setInventoryAuditId(issue.getInventoryAuditId());
        // Set document type: ADJUSTMENT when linked to inventory audit, otherwise NORMAL
        res.setDoctype(issue.getInventoryAuditId() != null ? "ADJUSTMENT" : "NORMAL");
        return res;
    }
}
