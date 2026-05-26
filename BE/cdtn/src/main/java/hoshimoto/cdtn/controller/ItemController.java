package hoshimoto.cdtn.controller;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import hoshimoto.cdtn.dto.ApiResponse;
import hoshimoto.cdtn.dto.ItemResponse;
import hoshimoto.cdtn.dto.request.ItemRequest;
import hoshimoto.cdtn.entity.Item;
import hoshimoto.cdtn.service.ItemService;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/items")
public class ItemController {

    @Autowired
    private ItemService itemService;

    /** Tất cả authenticated user có thể xem danh sách */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'STAFF')")
    public ResponseEntity<ApiResponse<List<ItemResponse>>> getAllItems() {
        List<ItemResponse> items = itemService.getAllItems()
                .stream().map(ItemController::toDto).collect(Collectors.toList());
        return ResponseEntity.ok(new ApiResponse<>(true, "Lấy danh sách hàng hóa thành công", items));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'STAFF')")
    public ResponseEntity<ApiResponse<ItemResponse>> getItemById(@PathVariable Long id) {
        return itemService.getItemById(id)
                .map(item -> ResponseEntity.ok(new ApiResponse<>(true, "Lấy chi tiết hàng hóa thành công", toDto(item))))
                .orElseGet(() -> ResponseEntity.status(404).body(new ApiResponse<>(false, "Không tìm thấy hàng hóa", null)));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'STAFF')")
    public ResponseEntity<ApiResponse<ItemResponse>> createItem(@Valid @RequestBody ItemRequest request) {
        Item created = itemService.createItem(request);
        return ResponseEntity.ok(new ApiResponse<>(true, "Tạo mới hàng hóa thành công", toDto(created)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'STAFF')")
    public ResponseEntity<ApiResponse<ItemResponse>> updateItem(
            @PathVariable Long id,
            @Valid @RequestBody ItemRequest request) {
        try {
            Item updated = itemService.updateItem(id, request);
            return ResponseEntity.ok(new ApiResponse<>(true, "Cập nhật hàng hóa thành công", toDto(updated)));
        } catch (RuntimeException e) {
            return ResponseEntity.status(404).body(new ApiResponse<>(false, e.getMessage(), null));
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<Void>> deleteItem(@PathVariable Long id) {
        try {
            itemService.deleteItem(id);
            return ResponseEntity.ok(new ApiResponse<>(true, "Vô hiệu hóa hàng hóa thành công", null));
        } catch (RuntimeException e) {
            return ResponseEntity.status(404).body(new ApiResponse<>(false, e.getMessage(), null));
        }
    }

    private static ItemResponse toDto(Item item) {
        ItemResponse dto = new ItemResponse();
        dto.setId(item.getId());
        dto.setItemcode(item.getItemcode());
        dto.setBarcode(item.getBarcode());
        dto.setItemname(item.getItemname());
        dto.setInvoicename(item.getInvoicename());
        dto.setDescription(item.getDescription());
        dto.setItemtype(item.getItemtype());
        dto.setUnitof(item.getUnitof());
        dto.setItemcatg(item.getItemcatg());
        dto.setMinstocklevel(item.getMinstocklevel());
        dto.setIsActive(item.getIsActive());
        dto.setCreatedAt(item.getCreatedAt() != null ? item.getCreatedAt().toString() : null);
        dto.setModifiedAt(item.getModifiedAt() != null ? item.getModifiedAt().toString() : null);
        dto.setModifiedBy(item.getModifiedBy());
        return dto;
    }
}
