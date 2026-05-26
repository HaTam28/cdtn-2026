package hoshimoto.cdtn.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import hoshimoto.cdtn.dto.request.ItemRequest;
import hoshimoto.cdtn.entity.Item;
import hoshimoto.cdtn.repository.ItemRepository;

@Service
public class ItemService {
    @Autowired
    private ItemRepository itemRepository;

    public List<Item> getAllItems() {
        return itemRepository.findAll();
    }

    public Optional<Item> getItemById(Long id) {
        return itemRepository.findById(id);
    }

    public Item createItem(ItemRequest request) {
        Item item = new Item();
        applyRequest(item, request);
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
        if (request.getIsActive() != null) item.setIsActive(request.getIsActive());
        if (request.getModifiedBy() != null) item.setModifiedBy(request.getModifiedBy());
    }
}
