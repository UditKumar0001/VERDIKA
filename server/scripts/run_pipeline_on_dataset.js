import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { agentPipeline } from '../services/agentPipeline.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runPipelineOnDataset() {
  console.log('--- Pipeline Runner Bridge ---');
  
  const args = process.argv.slice(2);
  let inputArg = null;
  let outputArg = null;

  for (let i = 0; i < args.length; i++) {
    if ((args[i] === '--input' || args[i] === '-i') && args[i + 1]) {
      inputArg = args[i + 1];
    }
    if ((args[i] === '--output' || args[i] === '-o') && args[i + 1]) {
      outputArg = args[i + 1];
    }
  }

  const merchantsPath = inputArg
    ? path.resolve(process.cwd(), inputArg)
    : path.resolve(__dirname, '../../data/merchants.json');

  const outputPath = outputArg
    ? path.resolve(process.cwd(), outputArg)
    : path.resolve(__dirname, '../../data/evals/pipeline_results.json');

  if (!fs.existsSync(merchantsPath)) {
    console.error(`Dataset not found at ${merchantsPath}`);
    process.exit(1);
  }

  const merchantsData = JSON.parse(fs.readFileSync(merchantsPath, 'utf8'));
  console.log(`Loaded dataset with ${merchantsData.length} records from ${merchantsPath}`);

  const results = [];
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < merchantsData.length; i++) {
    const record = merchantsData[i];
    try {
      const pipelineResult = await agentPipeline.execute(record);

      const combinedResult = {
        merchant_id: record.merchant_id,
        actual_outcome: record.actual_outcome,
        is_adversarial: record.is_adversarial,
        adversarial_pattern: record.adversarial_pattern || null,
        label_confidence_expected: record.label_confidence_expected,
        riskScore: pipelineResult.risk_result ? pipelineResult.risk_result.riskScore : null,
        confidence: pipelineResult.risk_result ? pipelineResult.risk_result.confidence : null,
        predictedAdversarialFlag: pipelineResult.adversarial_result ? pipelineResult.adversarial_result.adversarialFlag : false,
        predictedAdversarialScore: pipelineResult.adversarial_result ? pipelineResult.adversarial_result.adversarialScore : 0,
        detectedPatterns: pipelineResult.adversarial_result ? (pipelineResult.adversarial_result.detectedPatterns || []) : [],
        decision: pipelineResult.decision
      };

      results.push(combinedResult);
      successCount++;
    } catch (err) {
      errorCount++;
      console.error(`[Error] Failed to process record index ${i} (merchant_id: ${record.merchant_id}):`, err.message);
    }

    // Progress indicator every 20 records
    if ((i + 1) % 20 === 0 || i + 1 === merchantsData.length) {
      console.log(`[Progress] Processed ${i + 1}/${merchantsData.length} records...`);
    }
  }

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf8');
  console.log(`\nSuccessfully saved ${results.length} pipeline evaluation records to ${outputPath}`);

  console.log('\n========================================');
  console.log('FINAL EXECUTION SUMMARY');
  console.log('========================================');
  console.log(`Total dataset records : ${merchantsData.length}`);
  console.log(`Successfully processed: ${successCount}`);
  console.log(`Failed / Errored out : ${errorCount}`);

  return results;
}

runPipelineOnDataset().catch((err) => {
  console.error('Fatal error in pipeline runner bridge:', err);
  process.exit(1);
});
