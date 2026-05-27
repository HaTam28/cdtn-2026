package hoshimoto.cdtn.entity;

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

@Entity
@Table(name = "item")
@Data
public class Item {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false, length = 50)
    private String itemcode;

    @Column(length = 100)
    private String barcode;

    @Column(length = 200)
    private String itemname;

    @Column(length = 200)
    private String invoicename;

    @Column
    private Integer maxstocklevel;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(length = 50)
    private String itemtype;

    @Column(length = 30)
    private String unitof;

    @Column(length = 100)
    private String itemcatg;

    // industry column removed; use itemcatg for ngành hàng

    @Column
    private Integer minstocklevel;

    @CreationTimestamp
    @Column(updatable = false, name = "createdat")
    private LocalDateTime createdAt;

    @Column(name = "modifiedat")
    private LocalDateTime modifiedAt;

    @Column(length = 100, name = "modifiedby")
    private String modifiedBy;

    @Column(name = "isactive")
    private Boolean isActive = true;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "userid")
    private User user;
}