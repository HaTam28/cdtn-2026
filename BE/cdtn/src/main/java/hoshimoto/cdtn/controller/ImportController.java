package hoshimoto.cdtn.controller;

import java.io.IOException;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import hoshimoto.cdtn.dto.ImportItemDto;
import hoshimoto.cdtn.dto.ImportResult;
import hoshimoto.cdtn.service.CsvImportService;
import hoshimoto.cdtn.service.ImportService;
import hoshimoto.cdtn.service.XlsxImportService;

@RestController
@RequestMapping("/api/import/items")
public class ImportController {

    @Autowired
    private CsvImportService csvImportService;

    @Autowired
    private XlsxImportService xlsxImportService;

    @Autowired
    private ImportService importService;

    @PostMapping(value = "/csv", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ImportResult> importCsv(@RequestParam("file") MultipartFile file,
                                                  @RequestParam(name = "preview", required = false, defaultValue = "true") boolean preview,
                                                  @RequestParam(name = "sampleSize", required = false) Integer sampleSize) throws IOException {
        List<ImportItemDto> rows = csvImportService.importFromMultipartFile(file);
        ImportResult result = importService.processImport(rows, preview, sampleSize);
        return ResponseEntity.ok(result);
    }

    @PostMapping(value = "/xlsx", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ImportResult> importXlsx(@RequestParam("file") MultipartFile file,
                                                   @RequestParam(name = "preview", required = false, defaultValue = "true") boolean preview,
                                                   @RequestParam(name = "sampleSize", required = false) Integer sampleSize) throws IOException {
        List<ImportItemDto> rows = xlsxImportService.importFromXlsx(file);
        ImportResult result = importService.processImport(rows, preview, sampleSize);
        return ResponseEntity.ok(result);
    }
}
