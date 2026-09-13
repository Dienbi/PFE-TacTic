import logging
import os
from pathlib import Path

import fitz  # PyMuPDF
import pdfplumber
import pytesseract

logger = logging.getLogger(__name__)


class PdfTextExtractor:
    """Service for extracting text from PDF files."""

    def __init__(self):
        # Set Tesseract path for Windows
        if os.name == 'nt':  # Windows
            tesseract_path = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
            if os.path.exists(tesseract_path):
                pytesseract.pytesseract.tesseract_cmd = tesseract_path
                logger.info(f"Tesseract path set to: {tesseract_path}")
            else:
                logger.warning(f"Tesseract not found at {tesseract_path}, OCR may not work")

    async def extract(self, file_path: str) -> str:
        """Extract text from a PDF file."""
        try:
            logger.info(f"Starting PDF extraction for: {file_path}")

            # Check file size
            file_size = os.path.getsize(file_path)
            logger.info(f"PDF file size: {file_size} bytes")

            if file_size < 1000:
                logger.error(f"PDF file is too small ({file_size} bytes), likely corrupted or empty")
                raise ValueError(f"PDF file is too small ({file_size} bytes), likely corrupted or empty")

            text = ""

            # First try direct text extraction
            with pdfplumber.open(file_path) as pdf:
                logger.info(f"PDF opened successfully, pages: {len(pdf.pages)}")

                for page_num, page in enumerate(pdf.pages):
                    logger.info(f"Processing page {page_num + 1}")
                    page_text = page.extract_text()
                    logger.info(f"Page {page_num + 1} text length: {len(page_text) if page_text else 0}")

                    if page_text:
                        text += page_text + "\n"
                    else:
                        logger.warning(f"Page {page_num + 1} returned no text - might be image-based")
                        # Try extracting text from tables as fallback
                        tables = page.extract_tables()
                        if tables:
                            logger.info(f"Found {len(tables)} tables on page {page_num + 1}")
                            for table in tables:
                                for row in table:
                                    for cell in row:
                                        if cell:
                                            text += str(cell) + " "
                            text += "\n"

            # If no text extracted, try OCR
            if len(text.strip()) < 10:
                logger.info("Direct text extraction failed, attempting OCR")
                text = await self._extract_with_ocr(file_path)

            logger.info(f"Total extracted text length: {len(text)}")
            return text.strip()
        except Exception as e:
            logger.error(f"Failed to extract text from PDF {file_path}: {e}", exc_info=True)
            raise

    async def _extract_with_ocr(self, file_path: str) -> str:
        """Extract text from PDF using OCR with PyMuPDF."""
        try:
            logger.info(f"Starting OCR extraction for: {file_path}")

            # Open PDF with PyMuPDF
            doc = fitz.open(file_path)
            logger.info(f"Opened PDF with {len(doc)} pages")

            text = ""
            for page_num in range(len(doc)):
                logger.info(f"Running OCR on page {page_num + 1}")
                page = doc[page_num]

                # Render page to pixmap (image) with higher DPI for better OCR
                pix = page.get_pixmap(dpi=300)

                # Convert pixmap to PIL Image
                from PIL import Image, ImageEnhance
                img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)

                # Save image for debugging
                debug_path = f"D:\\PFE_TACTIC\\debug_page_{page_num + 1}.png"
                img.save(debug_path)
                logger.info(f"Saved debug image to: {debug_path}")

                # Try multiple OCR approaches
                page_text = ""

                # Approach 1: Basic OCR on original image
                try:
                    page_text = pytesseract.image_to_string(img, config=r'--oem 3 --psm 3')
                    logger.info(f"Basic OCR extracted {len(page_text)} characters")
                except Exception as e:
                    logger.warning(f"Basic OCR failed: {e}")

                # Approach 2: Preprocessed image if basic failed
                if len(page_text.strip()) < 10:
                    logger.info("Basic OCR failed, trying with preprocessing")
                    img_processed = img.convert('L')
                    enhancer = ImageEnhance.Contrast(img_processed)
                    img_processed = enhancer.enhance(2.0)
                    enhancer = ImageEnhance.Sharpness(img_processed)
                    img_processed = enhancer.enhance(2.0)

                    try:
                        page_text = pytesseract.image_to_string(img_processed, config=r'--oem 3 --psm 6 -l eng+fra')
                        logger.info(f"Preprocessed OCR extracted {len(page_text)} characters")
                    except Exception as e:
                        logger.warning(f"Preprocessed OCR failed: {e}")

                # Approach 3: Very permissive settings
                if len(page_text.strip()) < 10:
                    logger.info("Trying with permissive settings")
                    try:
                        page_text = pytesseract.image_to_string(img, config=r'--oem 1 --psm 1')
                        logger.info(f"Permissive OCR extracted {len(page_text)} characters")
                    except Exception as e:
                        logger.warning(f"Permissive OCR failed: {e}")

                logger.info(f"Final OCR extracted {len(page_text)} characters from page {page_num + 1}")

                if len(page_text) > 0:
                    logger.info(f"OCR text preview: {page_text[:200]}")
                else:
                    logger.warning(f"No text extracted from page {page_num + 1} despite all OCR attempts")

                text += page_text + "\n"

                # Clean up
                pix = None
                img = None

            doc.close()
            logger.info(f"OCR total extracted text length: {len(text)}")
            return text
        except Exception as e:
            logger.error(f"OCR extraction failed: {e}", exc_info=True)
            raise

    def validate_file(self, file_path: str) -> bool:
        """Validate that the file is a valid PDF."""
        if not Path(file_path).exists():
            return False

        try:
            with pdfplumber.open(file_path) as pdf:
                return len(pdf.pages) > 0
        except Exception:
            return False
