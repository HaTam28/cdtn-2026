package hoshimoto.cdtn.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import hoshimoto.cdtn.entity.Customer;

public interface CustomerRepository extends JpaRepository<Customer, Long> {
}
