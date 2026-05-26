package hoshimoto.cdtn.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import hoshimoto.cdtn.entity.Item;

public interface ItemRepository extends JpaRepository<Item, Long> {
}
