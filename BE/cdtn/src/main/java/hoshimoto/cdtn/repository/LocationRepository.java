package hoshimoto.cdtn.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import hoshimoto.cdtn.entity.Location;

public interface LocationRepository extends JpaRepository<Location, Long> {

    Optional<Location> findByLocationcode(String locationcode);

    /**
     * Vị trí đang trống hoàn toàn (không có ItemLocation active nào) và còn chứa được requiredQty.
     * Bao gồm cả vị trí capacity IS NULL (không giới hạn).
     */
    @Query("SELECT l FROM Location l WHERE l.isActive = true " +
           "AND (l.capacity IS NULL OR l.capacity >= :requiredQty) " +
           "AND l.id NOT IN (SELECT il.location.id FROM ItemLocation il WHERE il.isActive = true AND il.quantity > 0)")
    List<Location> findEmptyLocationsWithCapacity(@Param("requiredQty") java.math.BigDecimal requiredQty);

    /**
     * Tất cả vị trí đang còn chỗ trống (remainingCapacity > 0) – kể cả vị trí trống hoàn toàn
     * và vị trí đã chứa một phần nhưng vẫn còn dư.
     * Dùng để FE liệt kê checkbox cho người dùng chọn khi nhập kho (kể cả capacity < quantity cần nhập).
     */
    @Query("SELECT l FROM Location l WHERE l.isActive = true AND (" +
           "  l.capacity IS NULL " +
           "  OR l.capacity > (SELECT COALESCE(SUM(il.quantity), 0) FROM ItemLocation il " +
           "                    WHERE il.location.id = l.id AND il.isActive = true)" +
           ")")
    List<Location> findAllLocationsWithAnySpace();
}

