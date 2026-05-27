package hoshimoto.cdtn.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class RowError {
    private int rowIndex;
    private String message;
}
