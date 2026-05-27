package hoshimoto.cdtn.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import hoshimoto.cdtn.dto.ImportItemDto;
import hoshimoto.cdtn.dto.ImportResult;
import hoshimoto.cdtn.dto.RowError;
import hoshimoto.cdtn.entity.Item;
import hoshimoto.cdtn.repository.ItemRepository;

@Service
public class ImportService {

    private final ItemRepository itemRepository;

    public ImportService(ItemRepository itemRepository) {
        this.itemRepository = itemRepository;
    }

    @Transactional
    public ImportResult processImport(List<ImportItemDto> rows, boolean preview, Integer sampleSizePref) {
        ImportResult result = new ImportResult();
        result.setTotal(rows.size());

        int created = 0;
        int updated = 0;

        int idx = 1; // human-friendly row index
        for (ImportItemDto r : rows) {
            if (r.getItemCode() == null || r.getItemCode().isBlank()) {
                result.getErrors().add(new RowError(idx, "Missing required itemCode"));
                idx++;
                continue;
            }

            if (!preview) {
                java.util.Optional<Item> existing = itemRepository.findByItemcode(r.getItemCode());
                if (existing.isPresent()) {
                    Item item = existing.get();
                    applyDtoToEntity(r, item);
                    item.setModifiedAt(LocalDateTime.now());
                    itemRepository.save(item);
                    updated++;
                } else {
                    Item newItem = new Item();
                    applyDtoToEntity(r, newItem);
                    itemRepository.save(newItem);
                    created++;
                }
            }

            idx++;
        }

        result.setCreated(created);
        result.setUpdated(updated);
        // determine sample size: use provided preference or default 50, cap to MAX_SAMPLE
        final int DEFAULT_SAMPLE = 50;
        final int MAX_SAMPLE = 1000;
        int requested = (sampleSizePref == null) ? DEFAULT_SAMPLE : sampleSizePref;
        int sampleSize = Math.min(Math.max(0, requested), Math.min(MAX_SAMPLE, rows.size()));
        // convert sample DTOs to maps including only present fields
        List<ImportItemDto> sample = rows.subList(0, sampleSize);
        List<java.util.Map<String, Object>> sanitized = new java.util.ArrayList<>();
        for (ImportItemDto r : sample) {
            java.util.Map<String, Object> map = new java.util.HashMap<>();
            if (r.getPresentFields().contains("itemCode")) map.put("itemCode", r.getItemCode());
            if (r.getPresentFields().contains("barcode")) map.put("barcode", r.getBarcode());
            if (r.getPresentFields().contains("itemName")) map.put("itemName", r.getItemName());
            if (r.getPresentFields().contains("invoiceName")) map.put("invoiceName", r.getInvoiceName());
            if (r.getPresentFields().contains("description")) map.put("description", r.getDescription());
            if (r.getPresentFields().contains("itemType")) map.put("itemType", r.getItemType());
            if (r.getPresentFields().contains("unitOf")) map.put("unitOf", r.getUnitOf());
            if (r.getPresentFields().contains("itemCategory")) map.put("itemCategory", r.getItemCategory());
            if (r.getPresentFields().contains("minStockLevel")) map.put("minStockLevel", r.getMinStockLevel());
            sanitized.add(map);
        }
        result.setSample(sanitized);
        return result;
    }

    // Backwards-compatible overload used by existing tests/clients
    @Transactional
    public ImportResult processImport(List<ImportItemDto> rows, boolean preview) {
        return processImport(rows, preview, null);
    }

    private void applyDtoToEntity(ImportItemDto dto, Item item) {
        if (dto.getItemCode() != null) item.setItemcode(dto.getItemCode());
        if (dto.getBarcode() != null) item.setBarcode(dto.getBarcode());
        if (dto.getItemName() != null) item.setItemname(dto.getItemName());
        if (dto.getInvoiceName() != null) item.setInvoicename(dto.getInvoiceName());
        if (dto.getDescription() != null) item.setDescription(dto.getDescription());
        if (dto.getItemType() != null) item.setItemtype(dto.getItemType());
        if (dto.getUnitOf() != null) item.setUnitof(dto.getUnitOf());
        if (dto.getItemCategory() != null) item.setItemcatg(dto.getItemCategory());
        if (dto.getMinStockLevel() != null) item.setMinstocklevel(dto.getMinStockLevel());
    }
}
