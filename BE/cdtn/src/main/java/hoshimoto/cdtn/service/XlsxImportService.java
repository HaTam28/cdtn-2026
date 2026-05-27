package hoshimoto.cdtn.service;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;

import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.monitorjbl.xlsx.StreamingReader;

import hoshimoto.cdtn.dto.ImportItemDto;

@Service
public class XlsxImportService {

    // reuse header mapping from CsvImportService? Keep a minimal local map
    private static final Map<String, String> HEADER_MAP = new HashMap<>();
    static {
        HEADER_MAP.put(normalize("mã hàng"), "itemCode");
        HEADER_MAP.put(normalize("mã vật tư"), "itemCode");
        HEADER_MAP.put(normalize("mã vật tư hàng hóa"), "itemCode");
        HEADER_MAP.put(normalize("tên vật tư hàng hóa"), "itemName");
        HEADER_MAP.put(normalize("loại vật tư"), "itemType");
        HEADER_MAP.put(normalize("mô tả thông số kỹ thuật"), "description");
        HEADER_MAP.put(normalize("tên trên hóa đơn"), "invoiceName");
        HEADER_MAP.put(normalize("tồn tối thiểu"), "minStockLevel");
        HEADER_MAP.put(normalize("tồn tối đa"), "maxStockLevel");
        HEADER_MAP.put(normalize("mã vạch"), "barcode");
        HEADER_MAP.put(normalize("tên hàng"), "itemName");
        HEADER_MAP.put(normalize("tên hóa đơn"), "invoiceName");
        HEADER_MAP.put(normalize("mô tả"), "description");
        HEADER_MAP.put(normalize("loại hàng"), "itemType");
        HEADER_MAP.put(normalize("đơn vị tính"), "unitOf");
        HEADER_MAP.put(normalize("danh mục"), "itemCategory");
        HEADER_MAP.put(normalize("ngành hàng"), "itemCategory");
        HEADER_MAP.put(normalize("ngành"), "itemCategory");
        HEADER_MAP.put(normalize("mức tồn tối thiểu"), "minStockLevel");
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
        // accept additional common variants for min/max stock
        ALLOWED_NORMALIZED_HEADERS.add(normalize("mức tồn tối thiểu"));
        ALLOWED_NORMALIZED_HEADERS.add(normalize("mức tồn tối đa"));
        // industry / ngành hàng variants
        ALLOWED_NORMALIZED_HEADERS.add(normalize("ngành hàng"));
        ALLOWED_NORMALIZED_HEADERS.add(normalize("ngành"));
        ALLOWED_NORMALIZED_HEADERS.add(normalize("nganh hang"));
        ALLOWED_NORMALIZED_HEADERS.add(normalize("ngành hàng (tên)"));
    }

    public List<ImportItemDto> importFromXlsx(MultipartFile file) throws IOException {
        try (InputStream is = file.getInputStream(); Workbook workbook = StreamingReader.builder()
                .rowCacheSize(100)
                .bufferSize(4096)
                .open(is)) {

            Sheet sheet = workbook.getSheetAt(0);
            Iterator<Row> rowIterator = sheet.iterator();

            if (!rowIterator.hasNext()) return List.of();

            // read header
            Row headerRow = rowIterator.next();
            Map<Integer, String> indexToField = new HashMap<>();
            for (Cell cell : headerRow) {
                String header = getCellString(cell);
                String normalized = normalize(header);
                if (!ALLOWED_NORMALIZED_HEADERS.contains(normalized)) continue;
                String mapped = HEADER_MAP.get(normalized);
                if (mapped != null) indexToField.put(cell.getColumnIndex(), mapped);
            }

            List<ImportItemDto> list = new ArrayList<>();

            while (rowIterator.hasNext()) {
                Row row = rowIterator.next();
                if (isRowEmpty(row)) continue;
                ImportItemDto dto = new ImportItemDto();

                for (Map.Entry<Integer, String> e : indexToField.entrySet()) {
                    Cell c = row.getCell(e.getKey());
                    String value = c == null ? null : getCellString(c);
                    if (value == null) continue;
                    switch (e.getValue()) {
                        case "itemCode": dto.setItemCode(value); break;
                        case "barcode": dto.setBarcode(value); break;
                        case "itemName": dto.setItemName(value); break;
                        case "invoiceName": dto.setInvoiceName(value); break;
                        case "description": dto.setDescription(value); break;
                        case "itemType": dto.setItemType(value); break;
                        case "unitOf": dto.setUnitOf(value); break;
                        case "itemCategory": dto.setItemCategory(value); break;
                        // handled by itemCategory case
                        case "minStockLevel":
                            Integer minVal = parseIntegerRobust(value);
                            if (minVal != null) dto.setMinStockLevel(minVal);
                            break;
                        case "maxStockLevel":
                            Integer maxVal = parseIntegerRobust(value);
                            if (maxVal != null) dto.setMaxStockLevel(maxVal);
                            break;
                        
                    }
                    // mark present field
                    dto.getPresentFields().add(e.getValue());
                }

                list.add(dto);
            }

            return list;
        }
    }

    private boolean isRowEmpty(Row row) {
        for (Cell c : row) {
            if (c != null && !getCellString(c).isBlank()) return false;
        }
        return true;
    }

    private String getCellString(Cell cell) {
        if (cell == null) return "";
        try {
            switch (cell.getCellType()) {
                case STRING: return cell.getStringCellValue();
                case NUMERIC: return String.valueOf(cell.getNumericCellValue());
                case BOOLEAN: return String.valueOf(cell.getBooleanCellValue());
                case FORMULA: return cell.getCellFormula();
                case BLANK: return "";
                default: return cell.toString();
            }
        } catch (Exception e) {
            return cell.toString();
        }
    }

    private static String normalize(String s) {
        if (s == null) return "";
        return s.trim().toLowerCase()
                .replaceAll("[^\\p{L}\\p{Nd}]+", " ")
                .replaceAll("[\\s()\\-]+", " ")
                .strip();
    }

    private static Integer parseIntegerRobust(String value) {
        if (value == null) return null;
        String v = value.trim().replaceAll(",", "");
        if (v.isBlank()) return null;
        try {
            return Integer.parseInt(v);
        } catch (NumberFormatException e) {
            try {
                double d = Double.parseDouble(v);
                return (int) d;
            } catch (NumberFormatException ex) {
                return null;
            }
        }
    }
}
