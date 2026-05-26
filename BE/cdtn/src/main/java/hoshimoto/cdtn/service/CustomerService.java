package hoshimoto.cdtn.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import hoshimoto.cdtn.dto.request.CustomerRequest;
import hoshimoto.cdtn.entity.Customer;
import hoshimoto.cdtn.repository.CustomerRepository;

@Service
public class CustomerService {
    @Autowired
    private CustomerRepository customerRepository;

    public List<Customer> getAllCustomers() {
        return customerRepository.findAll();
    }

    public Optional<Customer> getCustomerById(Long id) {
        return customerRepository.findById(id);
    }

    public Customer createCustomer(CustomerRequest request) {
        Customer customer = new Customer();
        applyRequest(customer, request);
        return customerRepository.save(customer);
    }

    public Customer updateCustomer(Long id, CustomerRequest request) {
        return customerRepository.findById(id).map(c -> {
            applyRequest(c, request);
            c.setModifiedAt(LocalDateTime.now());
            return customerRepository.save(c);
        }).orElseThrow(() -> new RuntimeException("Không tìm thấy đối tượng với id: " + id));
    }

    public void deleteCustomer(Long id) {
        customerRepository.findById(id).map(c -> {
            c.setIsActive(false);
            c.setModifiedAt(LocalDateTime.now());
            return customerRepository.save(c);
        }).orElseThrow(() -> new RuntimeException("Không tìm thấy đối tượng với id: " + id));
    }

    private void applyRequest(Customer c, CustomerRequest request) {
        if (request.getCustomercode() != null) c.setCustomercode(request.getCustomercode());
        if (request.getCustomername() != null) c.setCustomername(request.getCustomername());
        if (request.getAddress() != null) c.setAddress(request.getAddress());
        if (request.getEmail() != null) c.setEmail(request.getEmail());
        if (request.getMobile() != null) c.setMobile(request.getMobile());
        if (request.getPartnername() != null) c.setPartnername(request.getPartnername());
        if (request.getPartnermobile() != null) c.setPartnermobile(request.getPartnermobile());
        if (request.getOwnername() != null) c.setOwnername(request.getOwnername());
        if (request.getTaxcode() != null) c.setTaxcode(request.getTaxcode());
        if (request.getItemcatg() != null) c.setItemcatg(request.getItemcatg());
        if (request.getBankaccount() != null) c.setBankaccount(request.getBankaccount());
        if (request.getBankname() != null) c.setBankname(request.getBankname());
        if (request.getIssupplier() != null) c.setIssupplier(request.getIssupplier());
        if (request.getIscustomer() != null) c.setIscustomer(request.getIscustomer());
        if (request.getIsActive() != null) c.setIsActive(request.getIsActive());
        if (request.getModifiedBy() != null) c.setModifiedBy(request.getModifiedBy());
    }
}
