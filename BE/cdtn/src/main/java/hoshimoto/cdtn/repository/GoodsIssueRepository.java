package hoshimoto.cdtn.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import hoshimoto.cdtn.entity.Enum.DocStatus;
import hoshimoto.cdtn.entity.GoodsIssue;

public interface GoodsIssueRepository extends JpaRepository<GoodsIssue, Long> {
    Optional<GoodsIssue> findByDocno(String docno);
    List<GoodsIssue> findByDocstatus(DocStatus docstatus);
    List<GoodsIssue> findAllByOrderByCreatedAtDesc();

    @Query("select r.docno from GoodsIssue r where r.docno like concat(:prefix, '%')")
    List<String> findDocnosByPrefix(@Param("prefix") String prefix);
}

