package hoshimoto.cdtn.service;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import hoshimoto.cdtn.dto.ImportItemDto;

@Service
public class CsvImportService {

    // Define expected header keys (normalized) mapped to DTO field names
    private static final Map<String, String> HEADER_MAP = new HashMap<>();

    static {
        HEADER_MAP.put(normalize("mã hàng"), "itemCode");
        HEADER_MAP.put(normalize("mã vật tư"), "itemCode");
        HEADER_MAP.put(normalize("mã vật tư hàng hóa"), "itemCode");
        HEADER_MAP.put(normalize("mã"), "itemCode");
        HEADER_MAP.put(normalize("code"), "itemCode");
        HEADER_MAP.put(normalize("tên vật tư hàng hóa"), "itemName");
        HEADER_MAP.put(normalize("loại vật tư"), "itemType");
        HEADER_MAP.put(normalize("mô tả thông số kỹ thuật"), "description");
        HEADER_MAP.put(normalize("tên trên hóa đơn"), "invoiceName");
        HEADER_MAP.put(normalize("tồn tối thiểu"), "minStockLevel");
        HEADER_MAP.put(normalize("tồn tối đa"), "maxStockLevel");
        HEADER_MAP.put(normalize("mã vạch"), "barcode");
        HEADER_MAP.put(normalize("barcode"), "barcode");
        HEADER_MAP.put(normalize("tên hàng"), "itemName");
        HEADER_MAP.put(normalize("tên"), "itemName");
        HEADER_MAP.put(normalize("tên hóa đơn"), "invoiceName");
        HEADER_MAP.put(normalize("tên hóa đơn (in)"), "invoiceName");
        HEADER_MAP.put(normalize("mô tả"), "description");
        HEADER_MAP.put(normalize("loại"), "itemType");
        HEADER_MAP.put(normalize("loại hàng"), "itemType");
        HEADER_MAP.put(normalize("đvt"), "unitOf");
        HEADER_MAP.put(normalize("đơn vị tính"), "unitOf");
        HEADER_MAP.put(normalize("danh mục"), "itemCategory");
        HEADER_MAP.put(normalize("ngành hàng"), "itemCategory");
        HEADER_MAP.put(normalize("ngành"), "itemCategory");
        HEADER_MAP.put(normalize("mức tồn tối thiểu"), "minStockLevel");
        HEADER_MAP.put(normalize("min stock"), "minStockLevel");
        HEADER_MAP.put(normalize("minstocklevel"), "minStockLevel");
    }

    // Only accept these exact headers (after normalization). Other columns will be ignored.
    private static final java.util.Set<String> ALLOWED_NORMALIZED_HEADERS = new java.util.HashSet<>();
    static {
        ALLOWED_NORMALIZED_HEADERS.add(normalize("mã vật tư"));
        ALLOWED_NORMALIZED_HEADERS.add(normalize("tên vật tư hàng hóa"));
        ALLOWED_NORMALIZED_HEADERS.add(normalize("loại vật tư"));
        ALLOWED_NORMALIZED_HEADERS.add(normalize("mô tả thông số kỹ thuật"));
        ALLOWED_NORMALIZED_HEADERS.add(normalize("tên trên hóa đơn"));
        ALLOWED_NORMALIZED_HEADERS.add(normalize("đơn vị tính"));
        ALLOWED_NORMALIZED_HEADERS.add(normalize("tồn tối thiểu"));
        ALLOWED_NORMALIZED_HEADERS.add(normalize("tồn tối đa"));
    }

    public List<ImportItemDto> importFromMultipartFile(MultipartFile file) throws IOException {
        try (InputStream in = file.getInputStream()) {
            return parseCsv(in);
        }
    }

    public List<ImportItemDto> parseCsv(InputStream inputStream) throws IOException {
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream, StandardCharsets.UTF_8))) {
            CSVParser parser = CSVFormat.DEFAULT
                    .withFirstRecordAsHeader()
                    .withIgnoreEmptyLines()
                    .withTrim()
                    .parse(reader);

            Map<String, String> headerToField = mapHeaders(parser.getHeaderMap().keySet());

            List<ImportItemDto> result = new ArrayList<>();

            for (CSVRecord record : parser) {
                ImportItemDto dto = new ImportItemDto();
                // record present fields based on headers found in file
                for (String mappedField : headerToField.values()) {
                    dto.getPresentFields().add(mappedField);
                }

                for (Map.Entry<String, String> entry : headerToField.entrySet()) {
                    String header = entry.getKey();
                    String field = entry.getValue();
                    String value = safeGet(record, header);

                    if (value == null) continue;

                    switch (field) {
                        case "itemCode": dto.setItemCode(value); break;
                        case "barcode": dto.setBarcode(value); break;
                        case "itemName": dto.setItemName(value); break;
                        case "invoiceName": dto.setInvoiceName(value); break;
                        case "description": dto.setDescription(value); break;
                        case "itemType": dto.setItemType(value); break;
                        case "unitOf": dto.setUnitOf(value); break;
                        case "itemCategory": dto.setItemCategory(value); break;
                        case "minStockLevel":
                            try {
                                if (!value.isBlank()) dto.setMinStockLevel(Integer.parseInt(value.trim()));
                            } catch (NumberFormatException ignored) {
                            }
                            break;
                        default:
                            break;
                    }
                }

                result.add(dto);
            }

            return result;
        }
    }

    private String safeGet(CSVRecord record, String header) {
        try {
            if (record.isMapped(header)) {
                return record.get(header);
            }
        } catch (Exception ignored) {}
        return null;
    }

    private Map<String, String> mapHeaders(Iterable<String> headers) {
        Map<String, String> m = new HashMap<>();
        for (String h : headers) {
            String normalized = normalize(h);
            // only map headers that are in the allowed set
            if (!ALLOWED_NORMALIZED_HEADERS.contains(normalized)) continue;
            String mapped = HEADER_MAP.get(normalized);
            if (mapped != null) {
                m.put(h, mapped); // keep original header string as key
            }
        }
        return m;
    }

    private static String normalize(String s) {
        if (s == null) return "";
        // normalize by keeping letters and digits, replace other chars with single space
        return s.trim().toLowerCase()
            .replaceAll("[^\\p{L}\\p{Nd}]+", " ")
            .replaceAll("[\\s()\\-]+", " ")
            .strip();
    }
}
