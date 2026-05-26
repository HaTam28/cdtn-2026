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
@Table(name = "customer")
@Data
public class Customer {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, length = 50)
    private String customercode;

    @Column(length = 200)
    private String customername;

    @Column(columnDefinition = "TEXT")
    private String address;

    @Column(length = 150)
    private String email;

    @Column(length = 20)
    private String mobile;

    @Column(length = 200)
    private String partnername;

    @Column(length = 20)
    private String partnermobile;

    @Column(length = 200)
    private String ownername;

    @Column(length = 30)
    private String taxcode;

    @Column(length = 100)
    private String itemcatg;

    @Column(length = 50)
    private String bankaccount;

    @Column(length = 100)
    private String bankname;

    @Column
    private Boolean issupplier;

    @Column
    private Boolean iscustomer;

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

    // Lombok @Data đã sinh getter/setter
}
