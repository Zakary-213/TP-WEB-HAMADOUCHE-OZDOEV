export function checkGoalScored(ball, leftGoal, rightGoal, goalReplay) {
    if (!ball || !ball.position || ball.isOutAnimationPlaying || ball.isOutOfPlay) return;

    const ballCenter = ball.position;
    let playerScored = false;
    let aiScored = false;

    if (Math.abs(ballCenter.x) > 45) {
        playerScored = rightGoal.triggerBox.intersectsPoint(ballCenter);
        aiScored = leftGoal.triggerBox.intersectsPoint(ballCenter);
    }

    if ((playerScored || aiScored) && goalReplay.isPlaying()) {
        goalReplay.triggerGoal({ playerScored, aiScored });
    }
}
