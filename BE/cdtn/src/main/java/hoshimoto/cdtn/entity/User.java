
package hoshimoto.cdtn.entity;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;

import hoshimoto.cdtn.entity.Enum.Role;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(unique = true, nullable = false, length = 50)
    private String usercode;
    @Column( length = 200)
    private String fullname;

    @Column(unique = true, nullable = false, length = 100)
    private String username;

    @Column(unique = true, length = 150)
    private String email;

    @Column(nullable = false, name = "passwordhash",length = 255)
    private String passwordHash;

    @Column(length = 100)
    private String department;

    @Column(name = "phone",length = 20)
    private String phoneNumber;

    @Column(columnDefinition = "TEXT")
    private String address;

    @CreationTimestamp
    private LocalDateTime birthdate;

    @Column(length = 10)
    private String gender;

    @CreationTimestamp
    private LocalDateTime firstworkingdate;

    @Column(length = 50)
    private String bankaccount;

    @Column(length = 100)
    private String bankname;

    @CreationTimestamp
    @Column(updatable = false, name = "createdat")
    private LocalDateTime createdAt;

    @CreationTimestamp
    @Column(name="modifiedat")
    private LocalDateTime modifiedAt;

    @Column(length = 100,name = "modifiedby")
    private String modifiedBy;

    @Column(nullable = false,name = "isactive" )
    private Boolean isActive =true;

    @Column( name = "rolename")
    @Enumerated(EnumType.STRING)
    private Role role;

    @CreationTimestamp
    private LocalDateTime lastlogin;

    @Column(name = "failedloginattempts")
    private Integer failedLoginAttempts =0;




    // Lombok sẽ tự sinh getter/setter
}
