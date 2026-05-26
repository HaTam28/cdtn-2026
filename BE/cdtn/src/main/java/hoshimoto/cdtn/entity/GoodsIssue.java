package hoshimoto.cdtn.entity;

import java.time.LocalDate;
import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;

import hoshimoto.cdtn.entity.Enum.DocStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
@Table(name = "goodsissue")
@Data
@NoArgsConstructor
public class GoodsIssue {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false, length = 50)
    private String docno;

    @Column(name = "docdate")
    private LocalDate docDate;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private DocStatus docstatus = DocStatus.DRAFT;


    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customerid")
    private Customer customer;

    // Mã số thuế (lưu lại tại thời điểm tạo phiếu, tránh thay đổi khi khách hàng đổi MST)
    @Column(length = 30, name = "taxcode")
    private String taxcode;

    @CreationTimestamp
    @Column(updatable = false, name = "createdat")
    private LocalDateTime createdAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "userid")
    private User user;


    @Column(name = "modifiedat")
    private LocalDateTime modifiedAt;

    @Column(length = 100, name = "modifiedby")
    private String modifiedBy;

    // Người duyệt (User)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approverid")
    private User approver;

    @Column(name = "inventory_audit_id")
    private Long inventoryAuditId;

}
