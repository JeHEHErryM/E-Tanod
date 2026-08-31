-- DropForeignKey
ALTER TABLE "CheckpointScan" DROP CONSTRAINT "CheckpointScan_checkpointId_fkey";

-- DropForeignKey
ALTER TABLE "CheckpointScan" DROP CONSTRAINT "CheckpointScan_patrolSessionId_fkey";

-- AlterTable
ALTER TABLE "CheckpointScan" ALTER COLUMN "checkpointId" DROP NOT NULL,
ALTER COLUMN "patrolSessionId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "CheckpointScan" ADD CONSTRAINT "CheckpointScan_checkpointId_fkey" FOREIGN KEY ("checkpointId") REFERENCES "Checkpoint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckpointScan" ADD CONSTRAINT "CheckpointScan_patrolSessionId_fkey" FOREIGN KEY ("patrolSessionId") REFERENCES "PatrolSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
