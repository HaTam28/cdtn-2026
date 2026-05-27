package hoshimoto.cdtn.service;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentMatchers;
import org.mockito.Mock;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;

import hoshimoto.cdtn.dto.ImportItemDto;
import hoshimoto.cdtn.dto.ImportResult;
import hoshimoto.cdtn.entity.Item;
import hoshimoto.cdtn.repository.ItemRepository;

@ExtendWith(MockitoExtension.class)
public class ImportServiceTest {

    @Mock
    private ItemRepository itemRepository;

    @Test
    public void testProcessImport_createsAndUpdates() {
        ImportService importService = new ImportService(itemRepository);

        ImportItemDto existing = new ImportItemDto();
        existing.setItemCode("E001");
        existing.setItemName("ExistItem");

        ImportItemDto newItem = new ImportItemDto();
        newItem.setItemCode("N001");
        newItem.setItemName("NewItem");

        Item dbItem = new Item();
        dbItem.setItemcode("E001");
        dbItem.setItemname("OldName");

        when(itemRepository.findByItemcode("E001")).thenReturn(Optional.of(dbItem));
        when(itemRepository.findByItemcode("N001")).thenReturn(Optional.empty());
        when(itemRepository.save(ArgumentMatchers.any(Item.class))).thenAnswer(i -> i.getArgument(0));

        ImportResult res = importService.processImport(List.of(existing, newItem), false);

        // expecting 1 created, 1 updated
        assertEquals(2, res.getTotal());
        assertEquals(1, res.getCreated());
        assertEquals(1, res.getUpdated());
    }
}
