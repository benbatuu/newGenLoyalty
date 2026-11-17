import { Module } from '@nestjs/common';
import { PlansModule } from '../plans/plans.module';
import { BranchPolicyService } from './branch-policy.service';
import { BranchesController } from './branches.controller';
import { BranchesService } from './branches.service';

@Module({
  imports: [PlansModule],
  controllers: [BranchesController],
  providers: [BranchesService, BranchPolicyService],
  exports: [BranchesService, BranchPolicyService],
})
export class BranchesModule {}
