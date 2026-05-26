package hoshimoto.cdtn.converter;

import java.util.ArrayList;
import java.util.List;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = false)
public class BooleanListConverter implements AttributeConverter<List<Boolean>, String> {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Override
    public String convertToDatabaseColumn(List<Boolean> attribute) {
        try {
            if (attribute == null) return null;
            return MAPPER.writeValueAsString(attribute);
        } catch (Exception e) {
            throw new RuntimeException("Failed to convert boolean list to JSON", e);
        }
    }

    @Override
    public List<Boolean> convertToEntityAttribute(String dbData) {
        try {
            if (dbData == null) return null;
            return MAPPER.readValue(dbData, new TypeReference<List<Boolean>>() {});
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }
}
