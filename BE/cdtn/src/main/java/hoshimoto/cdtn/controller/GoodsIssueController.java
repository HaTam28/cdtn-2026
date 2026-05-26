package hoshimoto.cdtn.controller;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import hoshimoto.cdtn.dto.ApiResponse;
import hoshimoto.cdtn.dto.GoodsIssueResponse;
import hoshimoto.cdtn.dto.LocationDetailResponse;
import hoshimoto.cdtn.dto.LocationSuggestionResponse;
import hoshimoto.cdtn.dto.request.GoodsIssueRequest;
import hoshimoto.cdtn.service.GoodsIssueService;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/goods-issues")
public class GoodsIssueController {

    @Autowired
    private GoodsIssueService goodsIssueService;

    /** Lấy danh sách tất cả phiếu xuất */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'STAFF')")
    public ResponseEntity<ApiResponse<List<GoodsIssueResponse>>> getAll() {
        return ResponseEntity.ok(new ApiResponse<>(true, "Lấy danh sách phiếu xuất thành công",
                goodsIssueService.getAll()));
    }

    /** Lấy chi tiết 1 phiếu xuất */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'STAFF')")
    public ResponseEntity<ApiResponse<GoodsIssueResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(new ApiResponse<>(true, "Lấy chi tiết phiếu xuất thành công",
                goodsIssueService.getById(id)));
    }

    /**
     * Liệt kê TẤT CẢ vị trí đang chứa itemId (không so sánh với quantity cần xuất).
     * Sắp xếp: tồn kho nhiều nhất trước. Mỗi vị trí kèm danh sách toàn bộ hàng tại đó.
     * GET /api/goods-issues/available-locations?itemId=1
     */
    @GetMapping("/available-locations")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'STAFF')")
    public ResponseEntity<ApiResponse<List<LocationDetailResponse>>> listAvailableForIssue(
            @RequestParam Long itemId) {
        List<LocationDetailResponse> locations = goodsIssueService.listAvailableForIssue(itemId);
        return ResponseEntity.ok(new ApiResponse<>(true, "Liệt kê vị trí khả dụng để xuất kho thành công", locations));
    }

    /**
     * Gợi ý phân bổ số lượng qua nhiều vị trí khi quantity > tồn tại một vị trí.
     * GET /api/goods-issues/suggest-split?itemId=1&quantity=1000
     */
    @GetMapping("/suggest-split")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'STAFF')")
    public ResponseEntity<ApiResponse<List<LocationSuggestionResponse>>> suggestSplit(
            @RequestParam Long itemId,
            @RequestParam BigDecimal quantity) {
        try {
            List<LocationSuggestionResponse> splits = goodsIssueService.suggestSplit(itemId, quantity);
            return ResponseEntity.ok(new ApiResponse<>(true, "Gợi ý phân bổ vị trí xuất thành công", splits));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(new ApiResponse<>(false, e.getMessage(), null));
        }
    }

    /** Tạo phiếu xuất nháp */
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'STAFF')")
    public ResponseEntity<ApiResponse<GoodsIssueResponse>> create(
            @Valid @RequestBody GoodsIssueRequest request) {
        return ResponseEntity.ok(new ApiResponse<>(true, "Tạo phiếu xuất thành công",
                goodsIssueService.createDraft(request)));
    }

    /** Cập nhật phiếu xuất nháp */
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'STAFF')")
    public ResponseEntity<ApiResponse<GoodsIssueResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody GoodsIssueRequest request) {
        return ResponseEntity.ok(new ApiResponse<>(true, "Cập nhật phiếu xuất thành công",
                goodsIssueService.updateDraft(id, request)));
    }

    /** Xác nhận phiếu xuất → trừ tồn kho */
    @PostMapping("/{id}/confirm")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<GoodsIssueResponse>> confirm(@PathVariable Long id) {
        return ResponseEntity.ok(new ApiResponse<>(true, "Xác nhận phiếu xuất thành công",
                goodsIssueService.confirm(id)));
    }

    /** Hủy phiếu xuất */
    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<GoodsIssueResponse>> cancel(@PathVariable Long id) {
        return ResponseEntity.ok(new ApiResponse<>(true, "Hủy phiếu xuất thành công",
                goodsIssueService.cancel(id)));
    }
}
