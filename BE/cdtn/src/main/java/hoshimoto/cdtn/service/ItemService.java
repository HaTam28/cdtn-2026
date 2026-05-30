package hoshimoto.cdtn.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import hoshimoto.cdtn.dto.request.ItemRequest;
import hoshimoto.cdtn.entity.Item;
import hoshimoto.cdtn.repository.InventoryBalanceRepository;
import hoshimoto.cdtn.repository.ItemRepository;

@Service
public class ItemService {
    @Autowired
    private ItemRepository itemRepository;

    @Autowired
    private InventoryBalanceRepository inventoryBalanceRepository;

    public List<Item> getAllItems() {
        return itemRepository.findAll();
    }

    public Optional<Item> getItemById(Long id) {
        return itemRepository.findById(id);
    }

    public BigDecimal getCurrentStock(Long itemId) {
        return inventoryBalanceRepository.findByItemId(itemId)
                .map(balance -> balance.getQuantity() != null ? balance.getQuantity() : BigDecimal.ZERO)
                .orElse(BigDecimal.ZERO);
    }

    public Item createItem(ItemRequest request) {
        Item item = new Item();
        applyRequest(item, request);
        // Set default stock levels when not provided on creation
        if (item.getMinstocklevel() == null) item.setMinstocklevel(50);
        if (item.getMaxstocklevel() == null) item.setMaxstocklevel(500);
        return itemRepository.save(item);
    }

    public Item updateItem(Long id, ItemRequest request) {
        return itemRepository.findById(id).map(item -> {
            applyRequest(item, request);
            item.setModifiedAt(LocalDateTime.now());
            return itemRepository.save(item);
        }).orElseThrow(() -> new RuntimeException("Không tìm thấy hàng hóa với id: " + id));
    }

    public void deleteItem(Long id) {
        itemRepository.findById(id).map(item -> {
            item.setIsActive(false);
            item.setModifiedAt(LocalDateTime.now());
            return itemRepository.save(item);
        }).orElseThrow(() -> new RuntimeException("Không tìm thấy hàng hóa với id: " + id));
    }

    private void applyRequest(Item item, ItemRequest request) {
        if (request.getItemcode() != null) item.setItemcode(request.getItemcode());
        if (request.getBarcode() != null) item.setBarcode(request.getBarcode());
        if (request.getItemname() != null) item.setItemname(request.getItemname());
        if (request.getInvoicename() != null) item.setInvoicename(request.getInvoicename());
        if (request.getDescription() != null) item.setDescription(request.getDescription());
        if (request.getItemtype() != null) item.setItemtype(request.getItemtype());
        if (request.getUnitof() != null) item.setUnitof(request.getUnitof());
        if (request.getItemcatg() != null) item.setItemcatg(request.getItemcatg());
        if (request.getMinstocklevel() != null) item.setMinstocklevel(request.getMinstocklevel());
        if (request.getMaxstocklevel() != null) item.setMaxstocklevel(request.getMaxstocklevel());
        if (request.getIsActive() != null) item.setIsActive(request.getIsActive());
        if (request.getModifiedBy() != null) item.setModifiedBy(request.getModifiedBy());
    }
}
