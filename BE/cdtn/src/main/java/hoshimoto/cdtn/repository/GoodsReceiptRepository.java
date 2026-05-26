package hoshimoto.cdtn.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import hoshimoto.cdtn.entity.Enum.DocStatus;
import hoshimoto.cdtn.entity.GoodsReceipt;

public interface GoodsReceiptRepository extends JpaRepository<GoodsReceipt, Long> {
    Optional<GoodsReceipt> findByDocno(String docno);
    List<GoodsReceipt> findByDocstatus(DocStatus docstatus);
    List<GoodsReceipt> findAllByOrderByCreatedAtDesc();

    @Query("select r.docno from GoodsReceipt r where r.docno like concat(:prefix, '%')")
    List<String> findDocnosByPrefix(@Param("prefix") String prefix);
}

