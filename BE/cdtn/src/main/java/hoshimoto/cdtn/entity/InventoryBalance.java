package hoshimoto.cdtn.entity;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "inventorybalance")
@Data
@NoArgsConstructor
public class InventoryBalance {
    @Id
    @Column(name = "itemid")
    private Long itemId;

    @OneToOne
    @JoinColumn(name = "itemid", insertable = false, updatable = false)
    private Item item;

    @Column(precision = 18, scale = 4)
    private BigDecimal quantity;

    @Column(name = "lastupdated")
    private LocalDateTime lastUpdated;
}
