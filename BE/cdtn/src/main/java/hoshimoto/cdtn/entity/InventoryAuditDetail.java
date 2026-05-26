package hoshimoto.cdtn.entity;

import java.math.BigDecimal;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "inventoryauditdetail")
@Data
@NoArgsConstructor
public class InventoryAuditDetail {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "auditid")
    private InventoryAudit inventoryAudit;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "itemid")
    private Item item;

    @Column(length = 30)
    private String unitof;

    @Column(precision = 18, scale = 4)
    private BigDecimal bookquantity;

    @Column(precision = 18, scale = 4)
    private BigDecimal actualquantity;

    @Column(precision = 18, scale = 4)
    private BigDecimal diffquantity;

    @Column(columnDefinition = "TEXT")
    private String description;
}
