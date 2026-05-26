package hoshimoto.cdtn.entity;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;

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
@Table(name = "batch")
@Data
@NoArgsConstructor
public class Batch {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false, length = 50, name = "batchcode")
    private String batchCode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "itemid", nullable = false)
    private Item item;

    @Column(length = 100, name = "namebatch")
    private String nameBatch;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "receiptdetailid")
    private GoodsReceiptDetail receiptDetail;

    @Column(name = "manufacturedate")
    private LocalDate manufactureDate;

    @Column(name = "expirydate")
    private LocalDate expiryDate;

    @Column(precision = 18, scale = 5, name = "unitcost")
    private BigDecimal unitCost;

    @Column(precision = 16, scale = 5, name = "quantityremaining")
    private BigDecimal quantityRemaining;

    @Column(precision = 16, scale = 5, name = "quantity")
    private BigDecimal quantity;

    @CreationTimestamp
    @Column(updatable = false, name = "createdat")
    private LocalDateTime createdAt;
}
