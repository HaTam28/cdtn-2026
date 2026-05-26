package hoshimoto.cdtn.controller;

import java.util.List;

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
import hoshimoto.cdtn.dto.LocationDetailResponse;
import hoshimoto.cdtn.dto.LocationResponse;
import hoshimoto.cdtn.dto.request.LocationRequest;
import hoshimoto.cdtn.entity.Location;
import hoshimoto.cdtn.service.LocationService;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/locations")
public class LocationController {

    @Autowired
    private LocationService locationService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'STAFF')")
    public ResponseEntity<ApiResponse<List<LocationResponse>>> getAllLocations() {
        List<LocationResponse> list = locationService.getAllLocations();
        return ResponseEntity.ok(new ApiResponse<>(true, "Lấy danh sách vị trí thành công", list));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'STAFF')")
    public ResponseEntity<ApiResponse<LocationResponse>> getLocationById(@PathVariable Long id) {
        return locationService.getLocationById(id)
                .map(l -> ResponseEntity.ok(new ApiResponse<>(true, "Lấy chi tiết vị trí thành công", l)))
                .orElseGet(() -> ResponseEntity.status(404).body(new ApiResponse<>(false, "Không tìm thấy vị trí", null)));
    }

    @GetMapping("/{id}/items")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'STAFF')")
    public ResponseEntity<ApiResponse<LocationDetailResponse>> getLocationItems(@PathVariable Long id) {
        try {
            LocationDetailResponse detail = locationService.getLocationDetail(id);
            return ResponseEntity.ok(new ApiResponse<>(true, "Lấy danh sách hàng hóa tại vị trí thành công", detail));
        } catch (RuntimeException e) {
            return ResponseEntity.status(404).body(new ApiResponse<>(false, e.getMessage(), null));
        }
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'STAFF')")
    public ResponseEntity<ApiResponse<LocationResponse>> createLocation(@Valid @RequestBody LocationRequest request) {
        Location created = locationService.createLocation(request);
        return ResponseEntity.ok(new ApiResponse<>(true, "Tạo mới vị trí thành công", locationService.toResponse(created)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'STAFF')")
    public ResponseEntity<ApiResponse<LocationResponse>> updateLocation(
            @PathVariable Long id,
            @Valid @RequestBody LocationRequest request) {
        try {
            Location updated = locationService.updateLocation(id, request);
            return ResponseEntity.ok(new ApiResponse<>(true, "Cập nhật vị trí thành công", locationService.toResponse(updated)));
        } catch (RuntimeException e) {
            return ResponseEntity.status(404).body(new ApiResponse<>(false, e.getMessage(), null));
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<Void>> deleteLocation(@PathVariable Long id) {
        try {
            locationService.deleteLocation(id);
            return ResponseEntity.ok(new ApiResponse<>(true, "Vô hiệu hóa vị trí thành công", null));
        } catch (RuntimeException e) {
            return ResponseEntity.status(404).body(new ApiResponse<>(false, e.getMessage(), null));
        }
    }
}
