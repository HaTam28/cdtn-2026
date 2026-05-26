package hoshimoto.cdtn.dto;

import lombok.Data;

@Data
public class CustomerResponse {
    private Long id;
    private String customercode;
    private String customername;
    private String address;
    private String email;
    private String mobile;
    private String partnername;
    private String partnermobile;
    private String ownername;
    private String taxcode;
    private String itemcatg;
    private String bankaccount;
    private String bankname;
    private Boolean issupplier;
    private Boolean iscustomer;
    private String createdAt;
    private String modifiedAt;
    private String modifiedBy;
    private Boolean isActive;
}
