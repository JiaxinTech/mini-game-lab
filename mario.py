"""
Simple Mario-like Platformer Game
Controls: ← → 移动, Space 跳跃, R 重新开始
"""

import pygame
import sys
import random

# 初始化 注释
pygame.init()
SCREEN_WIDTH, SCREEN_HEIGHT = 800, 600
screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
pygame.display.set_caption("Mini Mario")
clock = pygame.time.Clock()
font = pygame.font.SysFont("Arial", 28)
big_font = pygame.font.SysFont("Arial", 48)

# 颜色
WHITE = (255, 255, 255)
BLACK = (0, 0, 0)
RED = (255, 50, 50)
GREEN = (50, 200, 50)
BLUE = (50, 50, 255)
YELLOW = (255, 255, 0)
BROWN = (180, 100, 30)
SKY_BLUE = (100, 180, 255)
GRAY = (150, 150, 150)
ORANGE = (255, 165, 0)

GRAVITY = 0.6
JUMP_POWER = -12
PLAYER_SPEED = 5
FPS = 60


class Player:
    def __init__(self, x, y):
        self.rect = pygame.Rect(x, y, 30, 40)
        self.vx = 0
        self.vy = 0
        self.on_ground = False
        self.facing = 1  # 1 right, -1 left
        self.alive = True
        self.win = False

    def update(self, platforms):
        if not self.alive:
            return

        # 水平移动
        keys = pygame.key.get_pressed()
        self.vx = 0
        if keys[pygame.K_LEFT] or keys[pygame.K_a]:
            self.vx = -PLAYER_SPEED
            self.facing = -1
        if keys[pygame.K_RIGHT] or keys[pygame.K_d]:
            self.vx = PLAYER_SPEED
            self.facing = 1

        # 跳跃
        if (keys[pygame.K_SPACE] or keys[pygame.K_UP] or keys[pygame.K_w]) and self.on_ground:
            self.vy = JUMP_POWER
            self.on_ground = False

        # 重力
        self.vy += GRAVITY
        if self.vy > 15:
            self.vy = 15

        # 水平碰撞
        self.rect.x += self.vx
        for p in platforms:
            if self.rect.colliderect(p):
                if self.vx > 0:
                    self.rect.right = p.left
                elif self.vx < 0:
                    self.rect.left = p.right

        # 垂直碰撞
        self.rect.y += self.vy
        self.on_ground = False
        for p in platforms:
            if self.rect.colliderect(p):
                if self.vy > 0:
                    self.rect.bottom = p.top
                    self.on_ground = True
                    self.vy = 0
                elif self.vy < 0:
                    self.rect.top = p.bottom
                    self.vy = 0

        # 边界
        if self.rect.left < 0:
            self.rect.left = 0
        if self.rect.right > SCREEN_WIDTH:
            self.rect.right = SCREEN_WIDTH

        # 掉落死亡
        if self.rect.top > SCREEN_HEIGHT:
            self.alive = False

    def draw(self, surface):
        if not self.alive:
            return
        # 身体
        pygame.draw.rect(surface, RED, self.rect)
        # 帽子
        hat = pygame.Rect(self.rect.x - 2, self.rect.y - 8, 34, 10)
        pygame.draw.rect(surface, RED, hat)
        # 脸
        face_color = (255, 200, 180)
        pygame.draw.circle(surface, face_color, (self.rect.centerx, self.rect.y + 12), 10)
        # 眼睛
        eye_x = self.rect.centerx + (4 if self.facing > 0 else -4)
        pygame.draw.circle(surface, BLACK, (eye_x, self.rect.y + 10), 2)
        # 胡子
        mustache_rect = pygame.Rect(self.rect.centerx - 2, self.rect.y + 14, 4, 2)
        pygame.draw.rect(surface, BROWN, mustache_rect)
        # 背带裤
        overalls = pygame.Rect(self.rect.x + 4, self.rect.y + 22, 22, 18)
        pygame.draw.rect(surface, BLUE, overalls)


class Enemy:
    def __init__(self, x, y):
        self.rect = pygame.Rect(x, y, 30, 30)
        self.speed = 2
        self.alive = True
        self.death_timer = 0

    def update(self, platforms):
        if not self.alive:
            self.death_timer += 1
            return
        self.rect.x += self.speed
        # 碰到平台或边界就反向
        hit_wall = False
        if self.rect.left <= 0 or self.rect.right >= SCREEN_WIDTH:
            hit_wall = True
        for p in platforms:
            if self.rect.colliderect(p):
                hit_wall = True
        if hit_wall:
            self.speed = -self.speed

        # 重力
        on_plat = False
        self.rect.y += 4
        for p in platforms:
            if self.rect.colliderect(p):
                self.rect.bottom = p.top
                on_plat = True
        if not on_plat:
            self.rect.y -= 4
            self.rect.y += GRAVITY * 2
            for p in platforms:
                if self.rect.colliderect(p):
                    if self.speed > 0:
                        self.rect.right = p.left
                    else:
                        self.rect.left = p.right

    def draw(self, surface):
        if not self.alive:
            return
        # 身体（蘑菇-like）
        pygame.draw.ellipse(surface, BROWN, self.rect)
        # 蘑菇头
        cap = pygame.Rect(self.rect.x - 4, self.rect.y - 10, 38, 20)
        pygame.draw.ellipse(surface, BROWN, cap)
        # 白点
        dot1 = pygame.Rect(self.rect.x + 4, self.rect.y - 6, 8, 8)
        dot2 = pygame.Rect(self.rect.x + 18, self.rect.y - 6, 8, 8)
        pygame.draw.ellipse(surface, WHITE, dot1)
        pygame.draw.ellipse(surface, WHITE, dot2)
        # 眼睛
        pygame.draw.circle(surface, BLACK, (self.rect.x + 8, self.rect.y + 6), 2)
        pygame.draw.circle(surface, BLACK, (self.rect.x + 22, self.rect.y + 6), 2)


class Coin:
    def __init__(self, x, y):
        self.rect = pygame.Rect(x, y, 16, 16)
        self.collected = False
        self.frame = 0

    def update(self):
        self.frame += 0.1

    def draw(self, surface):
        if self.collected:
            return
        # 旋转效果
        scale = abs(pygame.math.Vector2(1, 0).rotate(int(self.frame * 360)).x)
        w = int(14 * abs(scale))
        if w > 0:
            coin_rect = pygame.Rect(self.rect.centerx - w // 2, self.rect.y, w, 16)
            pygame.draw.ellipse(surface, YELLOW, coin_rect)
            if w > 4:
                pygame.draw.ellipse(surface, ORANGE, coin_rect, 1)


class Flag:
    def __init__(self, x, y):
        self.rect = pygame.Rect(x, y, 20, 120)

    def draw(self, surface):
        # 旗杆
        pygame.draw.rect(surface, GRAY, (self.rect.centerx - 2, self.rect.y, 4, 120))
        # 旗子
        flag_pts = [
            (self.rect.centerx + 2, self.rect.y),
            (self.rect.centerx + 2, self.rect.y + 40),
            (self.rect.centerx + 40, self.rect.y + 20),
        ]
        pygame.draw.polygon(surface, GREEN, flag_pts)
        # 球顶
        pygame.draw.circle(surface, YELLOW, (self.rect.centerx, self.rect.y), 6)


def build_level():
    """创建关卡：平台、敌人、金币、终点旗"""
    platforms = []
    enemies = []
    coins = []
    flag = None

    # 地面（带缺口）
    # 地面段 1
    platforms.append(pygame.Rect(0, 550, 350, 50))
    # 坑
    # 地面段 2
    platforms.append(pygame.Rect(420, 550, 200, 50))
    # 地面段 3
    platforms.append(pygame.Rect(680, 550, 120, 50))

    # 浮空平台
    platforms.append(pygame.Rect(150, 420, 120, 16))
    platforms.append(pygame.Rect(350, 350, 120, 16))
    platforms.append(pygame.Rect(550, 420, 120, 16))
    platforms.append(pygame.Rect(100, 250, 100, 16))
    platforms.append(pygame.Rect(400, 220, 150, 16))
    platforms.append(pygame.Rect(650, 300, 100, 16))

    # 敌人
    enemies.append(Enemy(200, 510))
    enemies.append(Enemy(500, 510))
    enemies.append(Enemy(300, 310))

    # 金币
    coin_positions = [
        (170, 390), (370, 320), (570, 390),
        (120, 220), (420, 190), (670, 270),
        (300, 200), (500, 150),
    ]
    for cx, cy in coin_positions:
        coins.append(Coin(cx, cy))

    # 终点旗
    flag = Flag(700, 430)

    return platforms, enemies, coins, flag


def draw_clouds(surface, offset=0):
    clouds = [(100, 80, 60), (300, 50, 50), (550, 90, 70), (700, 40, 45)]
    for cx, cy, size in clouds:
        cx_adj = (cx + offset) % 900 - 100
        pygame.draw.ellipse(surface, WHITE, (cx_adj, cy, size, size * 0.6))
        pygame.draw.ellipse(surface, WHITE, (cx_adj + size * 0.3, cy - 10, size * 0.8, size * 0.7))


def draw_hills(surface):
    hills = [(50, 480, 150), (350, 490, 120), (600, 475, 180)]
    for hx, hy, hw in hills:
        pygame.draw.ellipse(surface, (150, 220, 120), (hx, hy, hw, 70))


def reset_game():
    player = Player(60, 480)
    platforms, enemies, coins, flag = build_level()
    return player, platforms, enemies, coins, flag


def main():
    player, platforms, enemies, coins, flag = reset_game()
    score = 0
    cloud_offset = 0
    game_over = False
    won = False
    running = True

    while running:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_r:
                    player, platforms, enemies, coins, flag = reset_game()
                    score = 0
                    game_over = False
                    won = False
                if event.key == pygame.K_ESCAPE:
                    running = False

        if not game_over and not won:
            # 更新
            player.update(platforms)
            cloud_offset += 0.3

            for e in enemies:
                e.update(platforms)

            # 玩家踩敌人
            for e in enemies:
                if e.alive and player.alive and player.rect.colliderect(e.rect):
                    if player.vy > 0 and player.rect.bottom - e.rect.top < 20:
                        e.alive = False
                        player.vy = JUMP_POWER / 1.5
                        score += 100
                    else:
                        player.alive = False

            # 收集金币
            for c in coins:
                if not c.collected and player.alive and player.rect.colliderect(c.rect):
                    c.collected = True
                    score += 50

            # 到达旗子
            if flag and player.alive and player.rect.colliderect(flag.rect):
                won = True
                player.win = True

            # 玩家死亡
            if not player.alive:
                game_over = True

            # 金币动画
            for c in coins:
                c.update()

        # 渲染
        screen.fill(SKY_BLUE)

        # 背景
        draw_clouds(screen, cloud_offset)
        draw_hills(screen)

        # 平台
        for p in platforms:
            pygame.draw.rect(screen, (140, 80, 40), p)
            pygame.draw.rect(screen, (160, 110, 50), (p.x, p.y, p.width, 4))

        # 金币
        for c in coins:
            c.draw(screen)

        # 敌人
        for e in enemies:
            e.draw(screen)

        # 旗子
        if flag:
            flag.draw(screen)

        # 玩家
        player.draw(screen)

        # UI
        score_text = font.render(f"Score: {score}", True, BLACK)
        screen.blit(score_text, (10, 10))

        # 游戏结束/胜利
        if game_over:
            go_text = big_font.render("GAME OVER", True, RED)
            screen.blit(go_text, (SCREEN_WIDTH // 2 - go_text.get_width() // 2, 200))
            hint = font.render("Press R to Restart", True, BLACK)
            screen.blit(hint, (SCREEN_WIDTH // 2 - hint.get_width() // 2, 260))

        if won:
            win_text = big_font.render("YOU WIN!", True, GREEN)
            screen.blit(win_text, (SCREEN_WIDTH // 2 - win_text.get_width() // 2, 200))
            hint = font.render("Press R to Restart", True, BLACK)
            screen.blit(hint, (SCREEN_WIDTH // 2 - hint.get_width() // 2, 260))

        # 操作提示
        controls = font.render("← → Move | Space Jump | R Restart", True, (80, 80, 80))
        screen.blit(controls, (10, SCREEN_HEIGHT - 30))

        pygame.display.flip()
        clock.tick(FPS)

    pygame.quit()
    sys.exit()


if __name__ == "__main__":
    main()
