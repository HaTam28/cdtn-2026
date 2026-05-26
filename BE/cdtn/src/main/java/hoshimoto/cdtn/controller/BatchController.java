package hoshimoto.cdtn.controller;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import hoshimoto.cdtn.dto.ApiResponse;
import hoshimoto.cdtn.dto.BatchResponse;
import hoshimoto.cdtn.dto.request.BatchRequest;
import hoshimoto.cdtn.entity.Batch;
import hoshimoto.cdtn.service.BatchService;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/batches")
public class BatchController {

    @Autowired
    private BatchService batchService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'STAFF')")
    public ResponseEntity<ApiResponse<List<BatchResponse>>> getAll() {
        List<BatchResponse> batches = batchService.getAll().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
        return ResponseEntity.ok(new ApiResponse<>(true, "Lấy danh sách lô hàng thành công", batches));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'STAFF')")
    public ResponseEntity<ApiResponse<BatchResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(new ApiResponse<>(true, "Lấy chi tiết lô hàng thành công",
                toResponse(batchService.getById(id))));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'STAFF')")
    public ResponseEntity<ApiResponse<BatchResponse>> create(@Valid @RequestBody BatchRequest request) {
        Batch batch = batchService.createBatch(request);
        return ResponseEntity.ok(new ApiResponse<>(true, "Tạo lô hàng thành công", toResponse(batch)));
    }

    private BatchResponse toResponse(Batch batch) {
        BatchResponse response = new BatchResponse();
        response.setId(batch.getId());
        response.setBatchCode(batch.getBatchCode());
        if (batch.getItem() != null) {
            response.setItemId(batch.getItem().getId());
            response.setItemcode(batch.getItem().getItemcode());
            response.setItemname(batch.getItem().getItemname());
        }
        response.setNameBatch(batch.getNameBatch());
        if (batch.getReceiptDetail() != null) {
            response.setReceiptDetailId(batch.getReceiptDetail().getId());
        }
        response.setManufactureDate(batch.getManufactureDate());
        response.setExpiryDate(batch.getExpiryDate());
        response.setUnitCost(batch.getUnitCost());
        response.setQuantity(batch.getQuantity());
        response.setQuantityRemaining(batch.getQuantityRemaining());
        response.setCreatedAt(batch.getCreatedAt());
        return response;
    }
}
