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
@Table(name = "location")
@Data
public class Location {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, length = 50)
    private String locationcode;

    @Column(length = 200)
    private String locationname;

    @Column(length = 30)
    private String rackno;

    @Column(length = 10)
    private String floorno;

    @Column(length = 10)
    private String columnno;

    @Column
    private Integer capacity;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "isactive")
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(updatable = false, name = "createdat")
    private LocalDateTime createdAt;

    @Column(name = "modifiedat")
    private LocalDateTime modifiedAt;

    @Column(length = 100, name = "modifiedby")
    private String modifiedBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "userid")
    private User user;

    // Lombok @Data đã sinh getter/setter
}
