import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseFloatPipe,
} from '@nestjs/common';
import { RestaurantsService } from './restaurants.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  Role,
  UpdateMenuItemSchema,
  UpdateMenuItem,
  ToggleRestaurantStatusSchema,
  ToggleRestaurantStatus,
  CreateMenuCategorySchema,
  CreateMenuCategory,
  CreateMenuItemSchema,
  CreateMenuItem,
  UpdateRestaurantProfileSchema,
  UpdateRestaurantProfile,
} from '@kin-delivery/contracts';

@Controller()
export class RestaurantsController {
  constructor(private readonly restaurantsService: RestaurantsService) {}

  @Get('restaurants')
  findNearby(
    @Query('lat', ParseFloatPipe) lat: number,
    @Query('lng', ParseFloatPipe) lng: number,
    @Query('radius', new ParseFloatPipe({ optional: true })) radius = 5,
  ) {
    return this.restaurantsService.findNearby(lat, lng, radius);
  }

  @Get('restaurants/:id')
  findById(@Param('id') id: string): Promise<any> {
    return this.restaurantsService.findById(id);
  }

  @Get('restaurants/:id/menu')
  getMenu(@Param('id') id: string): Promise<any> {
    return this.restaurantsService.getMenu(id);
  }

  @Put('restaurant/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTAURANT)
  toggleStatus(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(ToggleRestaurantStatusSchema)) dto: ToggleRestaurantStatus,
  ) {
    return this.restaurantsService.toggleStatus(user.sub, dto.isOpen);
  }

  @Post('restaurant/menu/categories')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTAURANT)
  createCategory(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(CreateMenuCategorySchema)) dto: CreateMenuCategory,
  ) {
    return this.restaurantsService.createCategory(user.sub, dto.name, dto.sortOrder);
  }

  @Post('restaurant/menu/items')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTAURANT)
  createMenuItem(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(CreateMenuItemSchema)) dto: CreateMenuItem,
  ): Promise<any> {
    return this.restaurantsService.createMenuItem(user.sub, dto.categoryId, {
      name: dto.name,
      description: dto.description,
      price: dto.price,
    });
  }

  @Put('restaurant/menu/items/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTAURANT)
  updateMenuItem(
    @CurrentUser() user: JwtPayload,
    @Param('id') itemId: string,
    @Body(new ZodValidationPipe(UpdateMenuItemSchema)) dto: UpdateMenuItem,
  ): Promise<any> {
    return this.restaurantsService.updateMenuItem(user.sub, itemId, dto);
  }

  @Delete('restaurant/menu/items/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTAURANT)
  deleteMenuItem(
    @CurrentUser() user: JwtPayload,
    @Param('id') itemId: string,
  ) {
    return this.restaurantsService.deleteMenuItem(user.sub, itemId);
  }

  @Put('restaurant/profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTAURANT)
  updateProfile(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(UpdateRestaurantProfileSchema)) dto: UpdateRestaurantProfile,
  ) {
    return this.restaurantsService.updateProfile(user.sub, dto);
  }
}
