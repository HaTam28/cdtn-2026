package hoshimoto.cdtn.dto;

import java.math.BigDecimal;

import lombok.Data;

@Data
public class LocationResponse {
    private Long id;
    private String locationcode;
    private String locationname;
    private String rackno;
    private String floorno;
    private String columnno;
    private Integer capacity;
    private BigDecimal usedCapacity;      // Tổng số lượng đang chiếm tại vị trí
    private BigDecimal remainingCapacity; // capacity - usedCapacity
    private String description;
    private Boolean isActive;
    private String createdAt;
    private String modifiedAt;
    private String modifiedBy;

    public static LocationResponse fromEntity(hoshimoto.cdtn.entity.Location l) {
        return fromEntity(l, null);
    }

    public static LocationResponse fromEntity(hoshimoto.cdtn.entity.Location l, java.math.BigDecimal usedCapacity) {
        LocationResponse dto = new LocationResponse();
        dto.setId(l.getId());
        dto.setLocationcode(l.getLocationcode());
        dto.setLocationname(l.getLocationname());
        dto.setRackno(l.getRackno());
        dto.setFloorno(l.getFloorno());
        dto.setColumnno(l.getColumnno());
        dto.setCapacity(l.getCapacity());
        dto.setDescription(l.getDescription());
        dto.setIsActive(l.getIsActive());
        dto.setCreatedAt(l.getCreatedAt() != null ? l.getCreatedAt().toString() : null);
        dto.setModifiedAt(l.getModifiedAt() != null ? l.getModifiedAt().toString() : null);
        dto.setModifiedBy(l.getModifiedBy());
        if (usedCapacity != null) {
            dto.setUsedCapacity(usedCapacity);
            if (l.getCapacity() != null) {
                dto.setRemainingCapacity(java.math.BigDecimal.valueOf(l.getCapacity()).subtract(usedCapacity));
            }
        }
        return dto;
    }

    public hoshimoto.cdtn.entity.Location toEntity() {
        hoshimoto.cdtn.entity.Location l = new hoshimoto.cdtn.entity.Location();
        l.setId(this.getId());
        l.setLocationcode(this.getLocationcode());
        l.setLocationname(this.getLocationname());
        l.setRackno(this.getRackno());
        l.setFloorno(this.getFloorno());
        l.setColumnno(this.getColumnno());
        l.setCapacity(this.getCapacity());
        l.setDescription(this.getDescription());
        l.setIsActive(this.getIsActive());
        // createdAt, modifiedAt, modifiedBy sẽ được xử lý ở tầng service/entity nếu cần
        return l;
    }
}
