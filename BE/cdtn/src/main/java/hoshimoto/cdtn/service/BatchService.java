package hoshimoto.cdtn.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import hoshimoto.cdtn.dto.request.BatchRequest;
import hoshimoto.cdtn.entity.Batch;
import hoshimoto.cdtn.entity.GoodsReceiptDetail;
import hoshimoto.cdtn.entity.Item;
import hoshimoto.cdtn.repository.BatchRepository;
import hoshimoto.cdtn.repository.GoodsReceiptDetailRepository;
import hoshimoto.cdtn.repository.ItemRepository;

@Service
public class BatchService {

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("yyyyMMdd");

    @Autowired
    private BatchRepository batchRepository;

    @Autowired
    private ItemRepository itemRepository;

    @Autowired
    private GoodsReceiptDetailRepository goodsReceiptDetailRepository;

    public List<Batch> getAll() {
        return batchRepository.findAllByOrderByCreatedAtDesc();
    }

    public Batch getById(Long id) {
        return batchRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy lô hàng id: " + id));
    }

    @Transactional
    public Batch createBatch(BatchRequest request) {
        Item item = itemRepository.findById(request.getItemId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy hàng hóa id: " + request.getItemId()));

        GoodsReceiptDetail receiptDetail = goodsReceiptDetailRepository.findById(request.getReceiptDetailId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy dòng phiếu nhập id: " + request.getReceiptDetailId()));

        Batch batch = new Batch();
        batch.setItem(item);
        LocalDate manufactureDate = request.getManufactureDate();
        String datePart = getDatePart(manufactureDate);
        String itemName = (item.getItemname() != null && !item.getItemname().isBlank())
            ? item.getItemname()
            : item.getItemcode();
        batch.setNameBatch(String.format("Lo %s dot %s", itemName, datePart));
        batch.setReceiptDetail(receiptDetail);
        batch.setManufactureDate(manufactureDate);
        batch.setExpiryDate(request.getExpiryDate());
        batch.setUnitCost(request.getUnitCost());
        batch.setQuantity(request.getQuantity());
        batch.setBatchCode(generateBatchCode(item.getItemcode(), manufactureDate));
        batch.setQuantityRemaining(BigDecimal.ZERO);
        return batchRepository.save(batch);
    }

    public String generateBatchCode(String itemCode, LocalDate manufactureDate) {
        String normalizedItem = normalizeCodeSegment(itemCode);
        String datePart = getDatePart(manufactureDate);
        String baseCode = String.format("%s-%s", normalizedItem, datePart);

        List<Batch> existing = batchRepository.findAllByBatchCodeStartingWithOrderByBatchCodeDesc(baseCode);
        if (existing.isEmpty()) {
            return baseCode;
        }

        int maxSequence = existing.stream()
                .map(Batch::getBatchCode)
                .map(code -> code.substring(baseCode.length()))
                .filter(suffix -> suffix.matches("-\\d+"))
                .mapToInt(suffix -> Integer.parseInt(suffix.substring(1)))
                .max()
                .orElse(0);

        return String.format("%s-%02d", baseCode, maxSequence + 1);
    }

    private String getDatePart(LocalDate manufactureDate) {
        return manufactureDate != null ? manufactureDate.format(DATE_FORMAT) : LocalDate.now().format(DATE_FORMAT);
    }


    private String normalizeCodeSegment(String input) {
        if (input == null || input.isBlank()) {
            return "UNKNOWN";
        }
        String segment = input.trim().toUpperCase();
        segment = segment.replaceAll("[^A-Z0-9]+", "-");
        segment = segment.replaceAll("^-+|-+$", "");
        return segment.isEmpty() ? "UNKNOWN" : segment;
    }

}
