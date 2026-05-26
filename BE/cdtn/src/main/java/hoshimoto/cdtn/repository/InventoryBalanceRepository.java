package hoshimoto.cdtn.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import hoshimoto.cdtn.entity.InventoryBalance;

public interface InventoryBalanceRepository extends JpaRepository<InventoryBalance, Long> {
    Optional<InventoryBalance> findByItemId(Long itemId);
}

