package hoshimoto.cdtn.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import hoshimoto.cdtn.entity.Enum.Role;
import hoshimoto.cdtn.entity.User;

public interface UserRepository extends JpaRepository<User, Long> {
	Optional<User> findByUsername(String username);
	Optional<User> findByEmail(String email);
	List<User> findByRole(Role role);
}
