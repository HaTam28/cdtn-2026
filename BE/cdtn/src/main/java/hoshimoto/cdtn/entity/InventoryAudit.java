package hoshimoto.cdtn.entity;

import java.time.LocalDate;
import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;

import hoshimoto.cdtn.entity.Enum.DocStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
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
@Table(name = "inventoryaudit")
@Data
@NoArgsConstructor
public class InventoryAudit {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, length = 50)
    private String docno;

    @Column(name = "docdate")
    private LocalDate docDate;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private DocStatus docstatus = DocStatus.DRAFT;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "userid")
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_userid")
    private User assignedUser;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approverid")
    private User approver;

    @CreationTimestamp
    @Column(updatable = false, name = "createdat")
    private LocalDateTime createdAt;

    @Column(length = 100, name = "createdby")
    private String createdBy;

    @Column(name = "modifiedat")
    private LocalDateTime modifiedAt;

    @Column(length = 100, name = "modifiedby")
    private String modifiedBy;

    @Column(name = "isactive")
    private Boolean isActive = true;

    @Column(name = "rejectreason", columnDefinition = "TEXT")
    private String rejectReason;

    @Column(name = "adjustment_created")
    private Boolean adjustmentCreated = false;

    @Column(name = "adjustment_flags", columnDefinition = "TEXT")
    @Convert(converter = hoshimoto.cdtn.converter.BooleanListConverter.class)
    private java.util.List<Boolean> adjustmentFlags;
}
