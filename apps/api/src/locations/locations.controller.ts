import { Controller, Get, Param, Query } from '@nestjs/common';
import { LocationsService } from './locations.service';

@Controller('locations')
export class LocationsController {
  constructor(private locations: LocationsService) {}

  @Get('regions')
  regions() {
    return this.locations.regions();
  }

  @Get('districts')
  districts(
    @Query('regionId') regionId?: string,
    @Query('q') q?: string,
  ) {
    return this.locations.districts(regionId, q);
  }

  /** Convenience: all districts with region label (for city filters) */
  @Get('district-names')
  districtNames() {
    return this.locations.districtNames();
  }

  @Get('districts/:districtId/wards')
  wards(
    @Param('districtId') districtId: string,
    @Query('q') q?: string,
  ) {
    return this.locations.wards(districtId, q);
  }
}
