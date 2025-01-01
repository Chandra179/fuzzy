import { Router } from 'express';
import { SearchConfig } from '../types';
import { SearchEngine } from '../search_engine';
import { processSearchResults } from '../page_extraction';

const router = Router();

router.post('/search', async (req, res) => {
  try {
    const searchConfig: SearchConfig = {
      query: req.body.query,
      numPages: req.body.numPages || 5,
      minDelay: req.body.minDelay || 1,
      maxDelay: req.body.maxDelay || 3,
    };

    await SearchEngine.performSearch(searchConfig);

    const jsonFilePath = `search_results_${searchConfig.query.replace(/ /g, '_')}.json`;

    res.json({
      success: true,
      data: {
        message: 'Search completed successfully',
        resultsFile: jsonFilePath,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred',
    });
  }
});

router.post('/process-results', async (req, res) => {
  try {
    const { filePath } = req.body;

    if (!filePath) {
      return res.status(400).json({
        success: false,
        error: 'File path is required',
      });
    }

    await processSearchResults(filePath);

    res.json({
      success: true,
      data: {
        message: 'Results processed successfully',
        processedFile: filePath.replace('.json', '_processed.json'),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred',
    });
  }
});

export default router;
