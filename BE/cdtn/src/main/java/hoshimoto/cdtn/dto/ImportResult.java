package hoshimoto.cdtn.dto;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import lombok.Data;

@Data
public class ImportResult {
    private int total;
    private int created;
    private int updated;
    private List<RowError> errors = new ArrayList<>();
    private List<Map<String, Object>> sample = new ArrayList<>();
}
