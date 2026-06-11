package hoshimoto.cdtn.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import hoshimoto.cdtn.dto.GoodsReceiptDetailResponse;
import hoshimoto.cdtn.dto.GoodsReceiptResponse;
import hoshimoto.cdtn.dto.LocationDetailResponse;
import hoshimoto.cdtn.dto.LocationDetailResponse.LocationItemStock;
import hoshimoto.cdtn.dto.LocationSuggestionResponse;
import hoshimoto.cdtn.dto.request.GoodsReceiptDetailRequest;
import hoshimoto.cdtn.dto.request.GoodsReceiptRequest;
import hoshimoto.cdtn.dto.request.RejectRequest;
import hoshimoto.cdtn.entity.Batch;
import hoshimoto.cdtn.entity.Customer;
import hoshimoto.cdtn.entity.Enum.DocStatus;
import hoshimoto.cdtn.entity.Enum.NotificationTargetType;
import hoshimoto.cdtn.entity.Enum.NotificationType;
import hoshimoto.cdtn.entity.Enum.Role;
import hoshimoto.cdtn.entity.GoodsReceipt;
import hoshimoto.cdtn.entity.GoodsReceiptDetail;
import hoshimoto.cdtn.entity.InventoryBalance;
import hoshimoto.cdtn.entity.Item;
import hoshimoto.cdtn.entity.ItemLocation;
import hoshimoto.cdtn.entity.Location;
import hoshimoto.cdtn.entity.User;
import hoshimoto.cdtn.repository.BatchRepository;
import hoshimoto.cdtn.repository.CustomerRepository;
import hoshimoto.cdtn.repository.GoodsReceiptDetailRepository;
import hoshimoto.cdtn.repository.GoodsReceiptRepository;
import hoshimoto.cdtn.repository.GoodsIssueDetailRepository;
import hoshimoto.cdtn.repository.InventoryAuditDetailRepository;
import hoshimoto.cdtn.repository.InventoryAuditRepository;
import hoshimoto.cdtn.repository.InventoryBalanceRepository;
import hoshimoto.cdtn.repository.ItemLocationRepository;
import hoshimoto.cdtn.repository.ItemRepository;
import hoshimoto.cdtn.repository.LocationRepository;
import hoshimoto.cdtn.repository.UserRepository;

@Service
public class GoodsReceiptService {

    @Autowired
    private GoodsReceiptRepository receiptRepository;
    @Autowired
    private GoodsReceiptDetailRepository detailRepository;
    @Autowired
    private GoodsIssueDetailRepository issueDetailRepository;
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
    private InventoryAuditDetailRepository inventoryAuditDetailRepository;
    @Autowired
    private NotificationService notificationService;
    @Autowired
    private BatchService batchService;

    // ───────────────────────── CRUD ─────────────────────────

    public List<GoodsReceiptResponse> getAll(Long userId) {
        // If userId is not provided, return all receipts.
        if (userId == null) {
            return receiptRepository.findAllByOrderByCreatedAtDesc()
                    .stream().map(this::toResponse).collect(Collectors.toList());
        }

        // If userId provided, enforce permission: STAFF cannot view other users' receipts.
        var optCurrent = getCurrentUser();
        if (optCurrent.isPresent()) {
            User current = optCurrent.get();
            if (current.getRole() != Role.ADMIN && current.getRole() != Role.MANAGER) {
                // STAFF — must only request their own receipts
                if (!current.getId().equals(userId)) {
                    throw new RuntimeException("Không có quyền xem phiếu của nhân viên khác");
                }
            }
        }

        return receiptRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    public GoodsReceiptResponse getById(Long id) {
        GoodsReceipt receipt = findOrThrow(id);
        return toResponse(receipt);
    }

    /**
     * Tạo phiếu nhập nháp (DRAFT).
     * FE gửi danh sách chi tiết kèm locationId đã chọn từ gợi ý.
     */
    @Transactional
    public GoodsReceiptResponse createDraft(GoodsReceiptRequest request) {
        GoodsReceipt receipt = new GoodsReceipt();
        applyHeader(receipt, request);
        if (receipt.getDocno() == null || receipt.getDocno().isBlank()) {
            receipt.setDocno(generateNextDocno("PN-", receiptRepository.findDocnosByPrefix("PN-")));
        } else if (receiptRepository.findByDocno(receipt.getDocno()).isPresent()) {
            throw new RuntimeException("Mã phiếu '" + receipt.getDocno() + "' đã tồn tại");
        }
        receipt.setDocstatus(DocStatus.DRAFT);
        receipt = receiptRepository.save(receipt);
        notifyManagersIfStaffCreated(receipt);

        validateAdjustmentDetailsForDraft(receipt, request.getDetails());
        saveDetails(receipt, request.getDetails());
        return toResponse(receipt);
    }

    /**
     * Cập nhật phiếu nháp (chỉ được sửa khi trạng thái DRAFT).
     */
    @Transactional
    public GoodsReceiptResponse updateDraft(Long id, GoodsReceiptRequest request) {
        GoodsReceipt receipt = findOrThrow(id);
        requireStatus(receipt, DocStatus.DRAFT, "Chỉ có thể sửa phiếu ở trạng thái DRAFT");

        applyHeader(receipt, request);
        receipt.setModifiedAt(LocalDateTime.now());
        receipt = receiptRepository.save(receipt);

        // If any batches were created for existing details, delete them because details
        // will be replaced.
        deleteBatchesForReceipt(id);
        detailRepository.deleteByGoodsReceiptId(id);
        validateAdjustmentDetailsForDraft(receipt, request.getDetails());
        saveDetails(receipt, request.getDetails());
        return toResponse(receipt);
    }

    /**
     * Xác nhận phiếu nhập kho.
     * Cập nhật ItemLocation và InventoryBalance theo từng dòng chi tiết.
     */
    @Transactional
    public GoodsReceiptResponse confirm(Long id) {
        GoodsReceipt receipt = findOrThrow(id);
        requireStatus(receipt, DocStatus.DRAFT, "Chỉ có thể xác nhận phiếu ở trạng thái DRAFT");

        List<GoodsReceiptDetail> details = detailRepository.findByGoodsReceiptId(id);

        if (details == null || details.isEmpty()) {
            throw new RuntimeException("Phiếu nhập không có dòng chi tiết nào");
        }

        for (GoodsReceiptDetail detail : details) {
            if (detail.getLocation() == null) {
                throw new RuntimeException(
                        "Dòng chi tiết với mã hàng '" + detail.getItemcode() + "' chưa được gán vị trí");
            }
            // Khi xác nhận phiếu ADJUSTMENT: bắt buộc liên kết chi tiết kiểm kê
            if (isAdjustment(receipt) && detail.getInventoryAuditDetailId() == null) {
                throw new RuntimeException(
                        "Phiếu nhập điều chỉnh: dòng '" + detail.getItemcode() + "' chưa liên kết chi tiết phiếu kiểm kê");
            }

            Item item = detail.getItem();
            Location location = detail.getLocation();
            BigDecimal qty = detail.getQuantity();

            validateLocationCapacity(location, qty);

            // Cập nhật ItemLocation
            ItemLocation il = itemLocationRepository
                    .findByItemIdAndLocationId(item.getId(), location.getId())
                    .orElseGet(() -> {
                        ItemLocation newIl = new ItemLocation();
                        newIl.setItem(item);
                        newIl.setLocation(location);
                        newIl.setQuantity(BigDecimal.ZERO);
                        newIl.setIsActive(true);
                        return newIl;
                    });

            il.setQuantity(il.getQuantity().add(qty));
            il.setIsActive(true);
            itemLocationRepository.save(il);

            // Cập nhật InventoryBalance
            InventoryBalance balance = inventoryBalanceRepository
                    .findByItemId(item.getId())
                    .orElseGet(() -> {
                        InventoryBalance b = new InventoryBalance();
                        b.setItemId(item.getId());
                        b.setQuantity(BigDecimal.ZERO);
                        return b;
                    });

            balance.setQuantity(balance.getQuantity().add(qty));
            balance.setLastUpdated(LocalDateTime.now());
            inventoryBalanceRepository.save(balance);

            applyBatch(receipt, detail);
        }

        receipt.setDocstatus(DocStatus.CONFIRMED);
        receipt.setModifiedAt(LocalDateTime.now());
        getCurrentUser().ifPresent(u -> {
            receipt.setApprover(u);
            receipt.setModifiedBy(u.getUsername());
        });
        receiptRepository.save(receipt);
        notifyCreatorApproved(receipt);
        return toResponse(receipt);
    }

    /**
     * Hủy phiếu nhập (chỉ DRAFT mới hủy được).
     */
    @Transactional
    public GoodsReceiptResponse cancel(Long id) {
        GoodsReceipt receipt = findOrThrow(id);
        requireStatus(receipt, DocStatus.DRAFT, "Chỉ có thể hủy phiếu ở trạng thái DRAFT");
        // Delete any batches created for this draft receipt — they should not exist if
        // the receipt is not approved.
        deleteBatchesForReceipt(id);
        receipt.setDocstatus(DocStatus.CANCELLED);
        receipt.setModifiedAt(LocalDateTime.now());
        getCurrentUser().ifPresent(u -> {
            receipt.setApprover(u);
            receipt.setModifiedBy(u.getUsername());
        });
        receiptRepository.save(receipt);
        return toResponse(receipt);
    }

    /**
     * Từ chối duyệt phiếu nhập.
     */
    @Transactional
    public GoodsReceiptResponse reject(Long id, RejectRequest request) {
        GoodsReceipt receipt = findOrThrow(id);
        if (receipt.getDocstatus() == DocStatus.CONFIRMED || receipt.getDocstatus() == DocStatus.CANCELLED
                || receipt.getDocstatus() == DocStatus.REJECTED) {
            throw new RuntimeException("Không thể từ chối phiếu đã được xử lý");
        }
        receipt.setDocstatus(DocStatus.REJECTED);
        receipt.setRejectReason(request.getReason());
        receipt.setModifiedAt(LocalDateTime.now());
        getCurrentUser().ifPresent(u -> {
            receipt.setApprover(u);
            receipt.setModifiedBy(u.getUsername());
        });
        receiptRepository.save(receipt);
        notifyCreatorRejected(receipt);
        return toResponse(receipt);
    }

    // ───────────────────────── AVAILABLE LOCATIONS (NHẬP KHO)
    // ─────────────────────────

    /**
     * Liệt kê TẤT CẢ vị trí còn chỗ trống (kể cả < quantity cần nhập).
     * Mỗi vị trí kèm danh sách sản phẩm đang chứa tại đó.
     * FE dùng để hiển thị danh sách tất cả vị trí còn chỗ (không so sánh với
     * quantity cần nhập).
     * Ưu tiên vị trí đã chứa cùng itemId (EXISTING) → trống hoàn toàn (EMPTY) →
     * chứa hàng khác (PARTIAL).
     */
    public List<LocationDetailResponse> listAvailableForReceipt(Long itemId) {
        List<Location> locations = locationRepository.findAllLocationsWithAnySpace();
        List<LocationDetailResponse> result = new ArrayList<>();

        for (Location loc : locations) {
            BigDecimal used = itemLocationRepository.getTotalUsedCapacity(loc.getId());
            BigDecimal cap = loc.getCapacity() != null ? BigDecimal.valueOf(loc.getCapacity()) : null;
            BigDecimal remaining = cap != null ? cap.subtract(used) : null;

            // Lấy danh sách hàng đang chứa tại vị trí này
            List<ItemLocation> itemsAtLoc = itemLocationRepository.findByLocationIdAndIsActiveTrue(loc.getId());
                List<LocationItemStock> stockList = itemsAtLoc.stream().map(il -> new LocationItemStock(
                    il.getItem().getId(),
                    il.getItem().getItemcode(),
                    il.getItem().getItemname(),
                    il.getItem().getUnitof(),
                    il.getQuantity(),
                    batchRepository.findAllByReceiptDetailLocationIdAndItemId(loc.getId(), il.getItem().getId())
                        .stream()
                        .map(Batch::getBatchCode).collect(Collectors.toList()),
                    java.util.Collections.<LocationDetailResponse.BatchStock>emptyList()))
                    .collect(Collectors.toList());

                List<String> itemCodes = itemsAtLoc.stream()
                    .map(il -> il.getItem().getItemcode())
                    .distinct()
                    .collect(Collectors.toList());

            // Phân loại vị trí
            boolean hasThisItem = itemsAtLoc.stream().anyMatch(il -> il.getItem().getId().equals(itemId));
            boolean isEmpty = itemsAtLoc.isEmpty();
            String type = hasThisItem ? "EXISTING" : (isEmpty ? "EMPTY" : "PARTIAL");

                result.add(new LocationDetailResponse(
                    loc.getId(), loc.getLocationcode(), loc.getLocationname(),
                    loc.getRackno(), loc.getFloorno(), loc.getColumnno(),
                    loc.getCapacity(), used, remaining, type, stockList, itemCodes));
        }

        // Sắp xếp: EXISTING trước → EMPTY → PARTIAL
        result.sort((a, b) -> {
            int order = typeOrder(a.getType()) - typeOrder(b.getType());
            if (order != 0)
                return order;
            // Cùng loại: ưu tiên vị trí còn nhiều chỗ hơn (null = unlimited → để đầu)
            if (a.getRemainingCapacity() == null)
                return -1;
            if (b.getRemainingCapacity() == null)
                return 1;
            return b.getRemainingCapacity().compareTo(a.getRemainingCapacity());
        });

        return result;
    }

    private int typeOrder(String type) {
        return switch (type) {
            case "EXISTING" -> 0;
            case "EMPTY" -> 1;
            default -> 2; // PARTIAL
        };
    }

    // ───────────────────────── LOCATION SUGGESTION ─────────────────────────

    /**
     * Gợi ý vị trí phù hợp khi nhập hàng.
     * 1. Ưu tiên vị trí đã chứa cùng item và còn chỗ (type = EXISTING)
     * 2. Sau đó đến vị trí hoàn toàn trống (type = EMPTY)
     */
    public List<LocationSuggestionResponse> suggestLocations(Long itemId, BigDecimal quantity) {
        List<LocationSuggestionResponse> result = new ArrayList<>();

        // Vị trí đang chứa item, tổng dùng tại vị trí < capacity → còn chỗ
        List<ItemLocation> existing = itemLocationRepository.findLocationsWithSpaceForItem(itemId);
        for (ItemLocation il : existing) {
            Location loc = il.getLocation();
            // Tổng tất cả items đang chiếm tại vị trí này
            BigDecimal usedCapacity = itemLocationRepository.getTotalUsedCapacity(loc.getId());
            // null capacity = unlimited → available = null (không giới hạn)
            BigDecimal available = loc.getCapacity() != null
                    ? BigDecimal.valueOf(loc.getCapacity()).subtract(usedCapacity)
                    : null;
            result.add(new LocationSuggestionResponse(
                    loc.getId(), loc.getLocationcode(), loc.getLocationname(),
                    loc.getCapacity(), usedCapacity, available, "EXISTING", null));
        }

        // Vị trí trống hoàn toàn còn đủ sức chứa số lượng cần nhập
        List<Location> emptyLocs = locationRepository.findEmptyLocationsWithCapacity(quantity);
        for (Location loc : emptyLocs) {
            BigDecimal available = loc.getCapacity() != null ? BigDecimal.valueOf(loc.getCapacity()) : BigDecimal.ZERO;
            result.add(new LocationSuggestionResponse(
                    loc.getId(), loc.getLocationcode(), loc.getLocationname(),
                    loc.getCapacity(), BigDecimal.ZERO, available, "EMPTY", null));
        }

        return result;
    }

    // ───────────────────────── PRIVATE HELPERS ─────────────────────────

    /**
     * Gợi ý phân bổ số lượng cần nhập qua nhiều vị trí (khi quantity > capacity một
     * vị trí).
     * Thứ tự ưu tiên: EXISTING → EMPTY. Tự động tính suggestedQuantity cho mỗi vị
     * trí.
     */
    public List<LocationSuggestionResponse> suggestSplit(Long itemId, BigDecimal quantity) {
        List<LocationSuggestionResponse> all = suggestLocations(itemId, quantity);
        List<LocationSuggestionResponse> result = new ArrayList<>();
        BigDecimal remaining = quantity;

        for (LocationSuggestionResponse loc : all) {
            if (remaining.compareTo(BigDecimal.ZERO) <= 0)
                break;
            // null availableSpace = unlimited capacity → có thể nhận toàn bộ số còn lại
            BigDecimal space = loc.getAvailableSpace() != null ? loc.getAvailableSpace() : remaining;
            if (space.compareTo(BigDecimal.ZERO) <= 0)
                continue;
            BigDecimal take = remaining.min(space);
            loc.setSuggestedQuantity(take);
            result.add(loc);
            remaining = remaining.subtract(take);
        }

        if (remaining.compareTo(BigDecimal.ZERO) > 0) {
            throw new RuntimeException(
                    "Không đủ vị trí trống để chứa " + quantity + " (còn thiếu " + remaining + ")");
        }
        return result;
    }

    private void applyHeader(GoodsReceipt receipt, GoodsReceiptRequest request) {
        String docno = request.getDocno();
        if (docno != null && !docno.isBlank()) {
            receipt.setDocno(docno.trim());
        }
        receipt.setDocDate(request.getDocDate());
        receipt.setDescription(request.getDescription());
        // If this receipt is created as an adjustment for an inventory audit, mark the
        // audit.
        if (request.getInventoryAuditId() != null) {
            receipt.setInventoryAuditId(request.getInventoryAuditId());
            var audit = inventoryAuditRepository.findById(request.getInventoryAuditId())
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy phiếu kiểm kê id: " + request.getInventoryAuditId()));
            audit.setAdjustmentCreated(true);
            // If FE provided adjustment flags with this ADJUSTMENT receipt, persist them.
            if (request.getAdjustmentFlags() != null) {
                audit.setAdjustmentFlags(request.getAdjustmentFlags());
            }
            inventoryAuditRepository.save(audit);
            // mark document type as ADJUSTMENT when linked to an inventory audit
            receipt.setDoctype("ADJUSTMENT");
            receipt.setInvoiceNumber(null);
            receipt.setCustomer(null);
            receipt.setTaxcode(null);
        }
        else if (receipt.getDoctype() == null) {
            receipt.setDoctype("NORMAL");
        }
        if (!isAdjustment(receipt)) {
            if (request.getInvoiceNumber() != null) {
                receipt.setInvoiceNumber(request.getInvoiceNumber().trim());
            }
            if (request.getCustomerId() != null) {
                Customer customer = customerRepository.findById(request.getCustomerId())
                        .orElseThrow(
                                () -> new RuntimeException("Không tìm thấy khách hàng id: " + request.getCustomerId()));
                receipt.setCustomer(customer);
                receipt.setTaxcode(customer.getTaxcode());
            }
        }
        // Gán người tạo từ JWT token (chỉ set khi tạo mới, không ghi đè khi update)
        if (receipt.getUser() == null) {
            getCurrentUser().ifPresent(receipt::setUser);
        }
    }

    private void notifyManagersIfStaffCreated(GoodsReceipt receipt) {
        User creator = receipt.getUser();
        if (creator == null || creator.getRole() != Role.STAFF)
            return;
        String docno = receipt.getDocno();
        notificationService.notifyManagers(
                NotificationType.APPROVAL_REQUIRED,
                NotificationTargetType.GOODS_RECEIPT,
                receipt.getId(),
                docno,
                "Phieu nhap can duyet",
                "Phieu nhap " + docno + " can duyet");
    }

    private void notifyCreatorApproved(GoodsReceipt receipt) {
        User creator = receipt.getUser();
        if (creator == null || creator.getRole() != Role.STAFF)
            return;
        String docno = receipt.getDocno();
        notificationService.notifyUser(
                creator,
                NotificationType.APPROVED,
                NotificationTargetType.GOODS_RECEIPT,
                receipt.getId(),
                docno,
                "Phieu nhap da duyet",
                "Phieu nhap " + docno + " da duyet");
    }

    private void notifyCreatorRejected(GoodsReceipt receipt) {
        User creator = receipt.getUser();
        if (creator == null || creator.getRole() != Role.STAFF)
            return;
        String docno = receipt.getDocno();
        notificationService.notifyUser(
                creator,
                NotificationType.REJECTED,
                NotificationTargetType.GOODS_RECEIPT,
                receipt.getId(),
                docno,
                "Phieu nhap bi tu choi",
                "Phieu nhap " + docno + " bi tu choi: " + receipt.getRejectReason()
        );
    }

    private java.util.Optional<User> getCurrentUser() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated())
            return java.util.Optional.empty();
        String username = auth.getName();
        return userRepository.findByUsername(username);
    }

    private void saveDetails(GoodsReceipt receipt, List<GoodsReceiptDetailRequest> detailRequests) {
        if (detailRequests == null)
            return;
        for (GoodsReceiptDetailRequest req : detailRequests) {
            Item item = itemRepository.findById(req.getItemId())
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy hàng hóa id: " + req.getItemId()));

            GoodsReceiptDetail detail = new GoodsReceiptDetail();
            detail.setGoodsReceipt(receipt);
            detail.setItem(item);
            detail.setItemcode(item.getItemcode());
            detail.setItemname(item.getItemname());
            detail.setUnitof(item.getUnitof());
            detail.setQuantity(req.getQuantity());
            detail.setUnitprice(req.getUnitprice() != null ? req.getUnitprice() : BigDecimal.ZERO);
            detail.setAmount(detail.getQuantity().multiply(detail.getUnitprice()));
            detail.setInventoryAuditDetailId(req.getInventoryAuditDetailId());

            if (req.getBatchId() != null) {
                Batch batch = batchRepository.findById(req.getBatchId())
                        .orElseThrow(() -> new RuntimeException("Không tìm thấy lô hàng id: " + req.getBatchId()));
                detail.setBatch(batch);
            } else if (isAdjustment(receipt) && req.getInventoryAuditDetailId() != null) {
                inventoryAuditDetailRepository.findById(req.getInventoryAuditDetailId())
                        .map(auditDetail -> auditDetail.getBatch())
                        .ifPresent(detail::setBatch);
            }

            if (req.getLocationId() != null) {
                Location location = locationRepository.findById(req.getLocationId())
                        .orElseThrow(() -> new RuntimeException("Không tìm thấy vị trí id: " + req.getLocationId()));
                detail.setLocation(location);
            }

            detailRepository.save(detail);
        }
    }

    private GoodsReceipt findOrThrow(Long id) {
        return receiptRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy phiếu nhập id: " + id));
    }

    private void requireStatus(GoodsReceipt receipt, DocStatus required, String message) {
        if (receipt.getDocstatus() != required) {
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

    private void applyBatch(GoodsReceipt receipt, GoodsReceiptDetail detail) {
        if (isAdjustment(receipt)) {
            Batch batch = detail.getBatch();
            if (batch == null) {
                throw new RuntimeException("Phiếu nhập điều chỉnh phải có mã lô");
            }
            
            Location batchOriginalLocation = (batch.getReceiptDetail() != null) ? batch.getReceiptDetail().getLocation() : null;
            
            if (batchOriginalLocation != null && batchOriginalLocation.getId().equals(detail.getLocation().getId())) {
                if (batch.getQuantity() == null) {
                    batch.setQuantity(BigDecimal.ZERO);
                }
                if (batch.getQuantityRemaining() == null) {
                    batch.setQuantityRemaining(BigDecimal.ZERO);
                }
                batch.setQuantity(batch.getQuantity().add(detail.getQuantity()));
                batch.setQuantityRemaining(batch.getQuantityRemaining().add(detail.getQuantity()));
                if (batch.getUnitCost() == null) {
                    batch.setUnitCost(detail.getUnitprice());
                }
                batchRepository.save(batch);
                
                detail.setBatch(batch);
                detailRepository.save(detail);
            } else {
                List<Batch> existingAtLocation = batchRepository.findAllByReceiptDetailLocationIdAndItemId(detail.getLocation().getId(), detail.getItem().getId());
                Batch batchAtLoc = null;
                for (Batch b : existingAtLocation) {
                    if (batch.getBatchCode().equals(b.getBatchCode())) {
                        batchAtLoc = b;
                        break;
                    }
                }
                
                if (batchAtLoc != null) {
                    if (batchAtLoc.getQuantity() == null) {
                        batchAtLoc.setQuantity(BigDecimal.ZERO);
                    }
                    if (batchAtLoc.getQuantityRemaining() == null) {
                        batchAtLoc.setQuantityRemaining(BigDecimal.ZERO);
                    }
                    batchAtLoc.setQuantity(batchAtLoc.getQuantity().add(detail.getQuantity()));
                    batchAtLoc.setQuantityRemaining(batchAtLoc.getQuantityRemaining().add(detail.getQuantity()));
                    batchRepository.save(batchAtLoc);
                    
                    detail.setBatch(batchAtLoc);
                    detailRepository.save(detail);
                } else {
                    Batch newBatch = new Batch();
                    newBatch.setItem(detail.getItem());
                    newBatch.setBatchCode(batch.getBatchCode());
                    newBatch.setNameBatch(batch.getNameBatch());
                    newBatch.setManufactureDate(batch.getManufactureDate());
                    newBatch.setExpiryDate(batch.getExpiryDate());
                    newBatch.setUnitCost(detail.getUnitprice() != null ? detail.getUnitprice() : batch.getUnitCost());
                    newBatch.setQuantity(detail.getQuantity());
                    newBatch.setQuantityRemaining(detail.getQuantity());
                    newBatch.setReceiptDetail(detail);
                    newBatch = batchRepository.save(newBatch);
                    
                    detail.setBatch(newBatch);
                    detailRepository.save(detail);
                }
            }
            return;
        }

        java.util.Optional<Batch> existingBatch = batchRepository.findByReceiptDetailId(detail.getId());
        if (existingBatch.isPresent()) {
            Batch batch = existingBatch.get();
            batch.setQuantity(detail.getQuantity());
            batch.setQuantityRemaining(detail.getQuantity());
            batchRepository.save(batch);
            return;
        }

        LocalDate receiptDate = receipt.getDocDate() != null ? receipt.getDocDate() : LocalDate.now();
        String batchCode = batchService.generateBatchCode(detail.getItemcode(), receiptDate);
        Batch newBatch = new Batch();
        newBatch.setItem(detail.getItem());
        newBatch.setBatchCode(batchCode);
        String itemDisplayName = detail.getItemname() != null && !detail.getItemname().isBlank()
                ? detail.getItemname()
                : detail.getItemcode();
        String datePart = receiptDate.format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd"));
        newBatch.setNameBatch(String.format("Lo %s dot %s", itemDisplayName, datePart));
        newBatch.setQuantity(detail.getQuantity());
        newBatch.setQuantityRemaining(detail.getQuantity());
        newBatch.setUnitCost(detail.getUnitprice());
        newBatch.setReceiptDetail(detail);
        batchRepository.save(newBatch);
    }

    /**
     * Delete any batches that are linked to receipt details of the given receipt.
     * This is used when a DRAFT receipt is cancelled or its details are replaced.
     */
    private void deleteBatchesForReceipt(Long receiptId) {
        List<GoodsReceiptDetail> existing = detailRepository.findByGoodsReceiptId(receiptId);
        if (existing == null || existing.isEmpty())
            return;
        for (GoodsReceiptDetail d : existing) {
            batchRepository.findByReceiptDetailId(d.getId()).ifPresent(batchRepository::delete);
        }
    }

    /**
     * Validation nhẹ khi lưu nháp phiếu nhập điều chỉnh (ADJUSTMENT).
     * Kiểm tra tính hợp lệ của liên kết kiểm kê và trùng lặp — KHÔNG bắt buộc locationId hay capacity.
     * locationId và capacity được kiểm tra đầy đủ trong confirm().
     */
    private void validateAdjustmentDetailsForDraft(GoodsReceipt receipt,
            List<GoodsReceiptDetailRequest> detailRequests) {
        if (!isAdjustment(receipt)) {
            return;
        }
        // Cho phép lưu nháp với details rỗng hoặc chưa đầy đủ
        if (detailRequests == null || detailRequests.isEmpty()) {
            return;
        }

        for (GoodsReceiptDetailRequest req : detailRequests) {
            if (req.getInventoryAuditDetailId() == null) {
                throw new RuntimeException("Phiếu nhập điều chỉnh phải liên kết chi tiết phiếu kiểm kê");
            }

            var auditDetail = inventoryAuditDetailRepository.findById(req.getInventoryAuditDetailId())
                    .orElseThrow(() -> new RuntimeException(
                            "Không tìm thấy chi tiết phiếu kiểm kê id: " + req.getInventoryAuditDetailId()));
            if (auditDetail.getInventoryAudit() == null
                    || !auditDetail.getInventoryAudit().getId().equals(receipt.getInventoryAuditId())) {
                throw new RuntimeException("Chi tiết phiếu kiểm kê không thuộc phiếu kiểm kê đã chọn");
            }
            if (auditDetail.getItem() != null && !auditDetail.getItem().getId().equals(req.getItemId())) {
                throw new RuntimeException("Vật tư không khớp với chi tiết phiếu kiểm kê");
            }

            Batch auditBatch = auditDetail.getBatch();
            if (auditBatch == null) {
                throw new RuntimeException("Phiếu nhập điều chỉnh phải có mã lô");
            }
            if (req.getBatchId() != null && !auditBatch.getId().equals(req.getBatchId())) {
                throw new RuntimeException("Mã lô không khớp với chi tiết phiếu kiểm kê");
            }
            if (auditBatch.getItem() != null && !auditBatch.getItem().getId().equals(req.getItemId())) {
                throw new RuntimeException("Mã lô không khớp với vật tư");
            }
            boolean usedByReceipt = detailRepository.existsActiveAdjustmentByAuditDetailId(
                    req.getInventoryAuditDetailId(), receipt.getId());
            boolean usedByIssue = issueDetailRepository.existsActiveAdjustmentByAuditDetailId(
                    req.getInventoryAuditDetailId(), null);
            if (usedByReceipt || usedByIssue) {
                throw new RuntimeException("Chi tiết phiếu kiểm kê đã được tạo phiếu điều chỉnh");
            }
            // locationId không bắt buộc khi lưu nháp — kiểm tra trong confirm()
        }
    }

    private void validateLocationCapacity(Location location, BigDecimal quantity) {
        if (location.getCapacity() == null) {
            return;
        }
        BigDecimal usedCapacity = itemLocationRepository.getTotalUsedCapacity(location.getId());
        BigDecimal maxCapacity = BigDecimal.valueOf(location.getCapacity());
        if (usedCapacity.add(quantity).compareTo(maxCapacity) > 0) {
            throw new RuntimeException("Vị trí không đủ sức chứa.");
        }
    }

    private boolean isAdjustment(GoodsReceipt receipt) {
        return receipt.getInventoryAuditId() != null || "ADJUSTMENT".equalsIgnoreCase(receipt.getDoctype());
    }

    public GoodsReceiptResponse toResponse(GoodsReceipt receipt) {
        GoodsReceiptResponse res = new GoodsReceiptResponse();
        res.setId(receipt.getId());
        res.setDocno(receipt.getDocno());
        res.setDocDate(receipt.getDocDate());
        res.setDescription(receipt.getDescription());
        res.setDocstatus(receipt.getDocstatus());
        res.setCreatedAt(receipt.getCreatedAt());
        if (receipt.getCustomer() != null) {
            res.setCustomerId(receipt.getCustomer().getId());
            res.setCustomerName(receipt.getCustomer().getCustomername());
            res.setCustomerTaxcode(receipt.getCustomer().getTaxcode());
        }
        if (receipt.getUser() != null) {
            res.setCreatedByUsername(receipt.getUser().getUsername());
            res.setCreatedByFullname(receipt.getUser().getFullname());
        } else {
            res.setCreatedByUsername(null);
            res.setCreatedByFullname(null);
        }
        if (receipt.getApprover() != null) {
            res.setActionByUsername(receipt.getApprover().getUsername());
            res.setActionByFullname(receipt.getApprover().getFullname());
            res.setApprovedAt(receipt.getModifiedAt());
        }
        List<GoodsReceiptDetail> details = detailRepository.findByGoodsReceiptId(receipt.getId());
        res.setInvoiceNumber(receipt.getInvoiceNumber());
        res.setInventoryAuditId(receipt.getInventoryAuditId());
        // Use persisted doctype if present, otherwise derive from inventoryAuditId for backward compatibility
        res.setDoctype(receipt.getDoctype() != null ? receipt.getDoctype() : (receipt.getInventoryAuditId() != null ? "ADJUSTMENT" : "NORMAL"));
        res.setDetails(details.stream().map(d -> {
            GoodsReceiptDetailResponse dr = new GoodsReceiptDetailResponse();
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
            dr.setInventoryAuditDetailId(d.getInventoryAuditDetailId());
            if (d.getLocation() != null) {
                dr.setLocationId(d.getLocation().getId());
                dr.setLocationcode(d.getLocation().getLocationcode());
                dr.setLocationname(d.getLocation().getLocationname());
            }
            if (d.getBatch() != null) {
                dr.setBatchId(d.getBatch().getId());
                dr.setBatchCode(d.getBatch().getBatchCode());
            }
            batchRepository.findByReceiptDetailId(d.getId()).ifPresent(batch -> {
                if (batch.getReceiptDetail() != null && batch.getReceiptDetail().getGoodsReceipt() != null
                        && batch.getReceiptDetail().getGoodsReceipt().getDocstatus() == DocStatus.CONFIRMED) {
                    dr.setBatchId(batch.getId());
                    dr.setBatchCode(batch.getBatchCode());
                }
            });
            return dr;
        }).collect(Collectors.toList()));
        res.setRejectReason(receipt.getRejectReason());
        return res;
    }
}
