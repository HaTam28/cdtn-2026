package hoshimoto.cdtn.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import hoshimoto.cdtn.entity.ItemLocation;

public interface ItemLocationRepository extends JpaRepository<ItemLocation, Long> {

    List<ItemLocation> findByItemIdAndIsActiveTrue(Long itemId);

    Optional<ItemLocation> findByItemIdAndLocationId(Long itemId, Long locationId);

    /**
     * Lấy vị trí đang chứa sản phẩm này với số lượng tồn >= requiredQty (dùng cho xuất kho)
     */
    @Query("SELECT il FROM ItemLocation il WHERE il.item.id = :itemId AND il.isActive = true AND il.quantity >= :requiredQty")
    List<ItemLocation> findAvailableForIssue(@Param("itemId") Long itemId, @Param("requiredQty") java.math.BigDecimal requiredQty);

    /**
     * Lấy vị trí đang chứa sản phẩm này mà TỔNG tồn kho tại vị trí < capacity (gợi ý nhập kho).
     * Dùng subquery để tính tổng tất cả mặt hàng tại vị trí đó.
     */
    @Query("SELECT il FROM ItemLocation il WHERE il.item.id = :itemId AND il.isActive = true " +
           "AND il.location.capacity IS NOT NULL " +
           "AND (SELECT COALESCE(SUM(il2.quantity), 0) FROM ItemLocation il2 " +
           "     WHERE il2.location.id = il.location.id AND il2.isActive = true) < il.location.capacity")
    List<ItemLocation> findLocationsWithSpaceForItem(@Param("itemId") Long itemId);

    /**
     * Tổng số lượng đang chiếm tại một vị trí (dùng để kiểm tra capacity khi xác nhận phiếu nhập).
     */
    @Query("SELECT COALESCE(SUM(il.quantity), 0) FROM ItemLocation il WHERE il.location.id = :locationId AND il.isActive = true")
    java.math.BigDecimal getTotalUsedCapacity(@Param("locationId") Long locationId);

    /**
     * Lấy tất cả ItemLocation đang active tại một vị trí – dùng để thống kê sản phẩm tại vị trí đó.
     */
    List<ItemLocation> findByLocationIdAndIsActiveTrue(Long locationId);

    /**
     * Lấy tất cả vị trí đang chứa sản phẩm itemId với quantity > 0 (bất kể số lượng).
     * Dùng cho xuất kho: FE liệt kê checkbox tất cả vị trí có hàng.
     */
    @Query("SELECT il FROM ItemLocation il WHERE il.item.id = :itemId AND il.isActive = true AND il.quantity > 0 ORDER BY il.quantity DESC")
    List<ItemLocation> findAllWithStockByItemId(@Param("itemId") Long itemId);
}

