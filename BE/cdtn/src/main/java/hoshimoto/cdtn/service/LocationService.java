package hoshimoto.cdtn.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import hoshimoto.cdtn.dto.LocationDetailResponse;
import hoshimoto.cdtn.dto.LocationDetailResponse.LocationItemStock;
import hoshimoto.cdtn.dto.LocationResponse;
import hoshimoto.cdtn.dto.request.LocationRequest;
import hoshimoto.cdtn.entity.ItemLocation;
import hoshimoto.cdtn.entity.Location;
import hoshimoto.cdtn.repository.BatchRepository;
import hoshimoto.cdtn.repository.ItemLocationRepository;
import hoshimoto.cdtn.repository.LocationRepository;

@Service
public class LocationService {
    @Autowired
    private LocationRepository locationRepository;

    @Autowired
    private ItemLocationRepository itemLocationRepository;

    @Autowired
    private BatchRepository batchRepository;

    public List<LocationResponse> getAllLocations() {
        return locationRepository.findAll().stream()
                .map(this::toResponse).collect(Collectors.toList());
    }

    public Optional<LocationResponse> getLocationById(Long id) {
        return locationRepository.findById(id).map(this::toResponse);
    }

    public LocationDetailResponse getLocationDetail(Long id) {
        Location loc = locationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy vị trí id: " + id));

        BigDecimal used = itemLocationRepository.getTotalUsedCapacity(loc.getId());
        BigDecimal cap = loc.getCapacity() != null ? BigDecimal.valueOf(loc.getCapacity()) : null;
        BigDecimal remaining = cap != null ? cap.subtract(used) : null;

        List<ItemLocation> itemsAtLoc = itemLocationRepository.findByLocationIdAndIsActiveTrue(loc.getId());
        List<LocationItemStock> stockList = itemsAtLoc.stream()
                .map(il -> new LocationItemStock(
                        il.getItem().getId(),
                        il.getItem().getItemcode(),
                        il.getItem().getItemname(),
                        il.getItem().getUnitof(),
                il.getQuantity(),
                batchRepository.findConfirmedByItemId(il.getItem().getId())
                    .stream()
                    .map(b -> b.getBatchCode()).collect(Collectors.toList())))
                .collect(Collectors.toList());

        String type = itemsAtLoc.isEmpty() ? "EMPTY" : "HAS_STOCK";

        return new LocationDetailResponse(
                loc.getId(), loc.getLocationcode(), loc.getLocationname(),
                loc.getRackno(), loc.getFloorno(), loc.getColumnno(),
                loc.getCapacity(), used, remaining, type, stockList);
    }

    public LocationResponse toResponse(Location l) {
        BigDecimal usedCapacity = itemLocationRepository.getTotalUsedCapacity(l.getId());
        return LocationResponse.fromEntity(l, usedCapacity);
    }

    public Location createLocation(LocationRequest request) {
        Location location = new Location();
        applyRequest(location, request);
        return locationRepository.save(location);
    }

    public Location updateLocation(Long id, LocationRequest request) {
        return locationRepository.findById(id).map(l -> {
            applyRequest(l, request);
            l.setModifiedAt(LocalDateTime.now());
            return locationRepository.save(l);
        }).orElseThrow(() -> new RuntimeException("Không tìm thấy vị trí với id: " + id));
    }

    public void deleteLocation(Long id) {
        locationRepository.findById(id).map(l -> {
            l.setIsActive(false);
            l.setModifiedAt(LocalDateTime.now());
            return locationRepository.save(l);
        }).orElseThrow(() -> new RuntimeException("Không tìm thấy vị trí với id: " + id));
    }

    private void applyRequest(Location l, LocationRequest request) {
        if (request.getLocationcode() != null) l.setLocationcode(request.getLocationcode());
        if (request.getLocationname() != null) l.setLocationname(request.getLocationname());
        if (request.getRackno() != null) l.setRackno(request.getRackno());
        if (request.getFloorno() != null) l.setFloorno(request.getFloorno());
        if (request.getColumnno() != null) l.setColumnno(request.getColumnno());
        if (request.getCapacity() != null) l.setCapacity(request.getCapacity());
        if (request.getDescription() != null) l.setDescription(request.getDescription());
        if (request.getIsActive() != null) l.setIsActive(request.getIsActive());
        if (request.getModifiedBy() != null) l.setModifiedBy(request.getModifiedBy());
    }
}
