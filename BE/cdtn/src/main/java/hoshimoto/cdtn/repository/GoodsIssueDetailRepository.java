package hoshimoto.cdtn.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import hoshimoto.cdtn.entity.GoodsIssueDetail;

public interface GoodsIssueDetailRepository extends JpaRepository<GoodsIssueDetail, Long> {
    List<GoodsIssueDetail> findByGoodsIssueId(Long issueId);
    void deleteByGoodsIssueId(Long issueId);
}

