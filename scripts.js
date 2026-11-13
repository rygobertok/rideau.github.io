import gsap from 'gsap';
const Component = {
    el: {
        button: document.querySelector('.top-7-21-button'),
        canvas: document.querySelector('.top-7-21-stripes'),
        container: document.querySelector('.top-7-21-container'),
        hitZone: document.querySelector('.top-7-21-hit-zone'),
        loader: document.querySelector('.top-7-21-loader'),
        video: document.querySelector('.top-7-21-video'),
        videoContainer: document.querySelector('.top-7-21-video > div'),
    },
    interactive: false,
    ytPlayer: null,
    ytPlayerReady: false,
    init() {
        // LenisScroll.init()
        // gsap.registerPlugin(ScrollTrigger)
        this.handleVideo(() => {
            this.resizeContainer();
            this.handleStripes();
            gsap
                //
                .timeline({ defaults: { duration: 1.234 } })
                .set(this.el.video, { autoAlpha: 0 })
                .to(this.el.loader, { autoAlpha: 0, duration: 2.1, pointerEvents: 'none' });
        });
    },
    handleStartButton() {
        gsap.to(this.el.button, { duration: 0.5, opacity: 0, pointerEvents: 'none', scale: 1.5 });
        this.ytPlayer?.setVolume(100);
        this.ytPlayer?.playVideo();
        gsap.set(this.el.hitZone, { pointerEvents: 'auto' });
        gsap.to(this.el.video, { autoAlpha: 1, duration: 2.1 });
    },
    handleStripes() {
        const { container, canvas, button, hitZone } = Component.el;
        if (!container || !canvas || !hitZone) {
            throw new Error('Container, canvas or hit zone not found');
        }
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Could not get 2D context');
        }
        const stripes = [];
        const pointer = {
            x: 0,
            y: 0,
            active: false,
            down: false,
        };
        const gravity = 0.521;
        const damping = 0.985;
        // const leftOffsetPercent = 12
        // const rightOffsetPercent = 12
        const topOffsetPercent = 0; // 4
        const bottomOffsetPercent = 4;
        const segmentLengthMin = 10;
        const segmentLengthMax = 21;
        const segmentLengthPercent = 2.1;
        const stripeHeightVariationMinPercent = 85;
        const stripeHeightVariationMaxPercent = 92;
        const lineWidthMin = 1;
        const lineWidthMax = 210; // 3
        const lineToSpacingRatio = 0.9;
        const textureDotRadiusRatio = 0.25;
        const textureSpacingRatio = 1.2;
        const iterations = 12;
        let stripesCount = 63; // 21
        const getSize = () => ({
            width: container.clientWidth,
            height: container.clientHeight,
        });
        const clamp = (min, value, max) => {
            return Math.max(min, Math.min(max, value));
        };
        const getSegmentLength = (height) => {
            return clamp(segmentLengthMin, height * (segmentLengthPercent / 100), segmentLengthMax);
        };
        const getSpacing = (width) => {
            return width / (stripesCount + 1);
        };
        const getHorizontalBounds = (width) => {
            if (!this.el.video || !this.el.video.firstElementChild || !this.el.container)
                return;
            const videoPercentWidth = (this.el.video.firstElementChild.clientWidth / this.el.container.clientWidth) * 100;
            const sideOffsetPercent = ((100 - videoPercentWidth) / 2) * 0.9;
            // const leftOffset = width * (leftOffsetPercent / 100)
            // const rightOffset = width * (rightOffsetPercent / 100)
            const leftOffset = width * (sideOffsetPercent / 100);
            const rightOffset = width * (sideOffsetPercent / 100);
            return {
                leftOffset,
                rightOffset,
                availableWidth: Math.max(0, width - leftOffset - rightOffset),
            };
        };
        const getLineWidth = (width) => {
            return clamp(lineWidthMin, getSpacing(width) * lineToSpacingRatio, lineWidthMax);
        };
        const setStripesCount = () => {
            let count = 63;
            count = window.innerWidth < 1500 ? 50 : count;
            count = window.innerWidth < 1000 ? 42 : count;
            count = window.innerWidth < 800 ? 30 : count;
            count = window.innerWidth < 500 ? 21 : count;
            return count;
        };
        let segmentLength = getSegmentLength(getSize().height);
        let lineWidth = getLineWidth(getSize().width);
        const createStripes = () => {
            stripes.length = 0;
            stripesCount = setStripesCount();
            const { width, height } = getSize();
            const topOffset = height * (topOffsetPercent / 100);
            const bottomOffset = height * (bottomOffsetPercent / 100);
            const availableHeight = Math.max(0, height - topOffset - bottomOffset);
            const { leftOffset, availableWidth } = getHorizontalBounds(width);
            const spacing = getSpacing(availableWidth);
            for (let i = 0; i < stripesCount; i++) {
                const x = leftOffset + spacing * (i + 1);
                const stripeHeightVariationPercent = stripeHeightVariationMinPercent + Math.random() * (stripeHeightVariationMaxPercent - stripeHeightVariationMinPercent);
                const stripeHeight = availableHeight * (stripeHeightVariationPercent / 100);
                const pointsCount = Math.max(2, Math.round(stripeHeight / segmentLength) + 1);
                const stripe = [];
                for (let j = 0; j < pointsCount; j++) {
                    stripe.push({
                        x,
                        y: topOffset + j * segmentLength,
                        oldX: x,
                        oldY: topOffset + j * segmentLength,
                        pinned: j === 0,
                    });
                }
                stripes.push(stripe);
            }
        };
        const resize = () => {
            const { width, height } = getSize();
            const pixelRatio = window.devicePixelRatio || 1;
            const { availableWidth } = getHorizontalBounds(width);
            segmentLength = getSegmentLength(height);
            lineWidth = getLineWidth(availableWidth);
            canvas.width = width * pixelRatio;
            canvas.height = height * pixelRatio;
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
            ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
            createStripes();
        };
        const updatePoint = (point) => {
            if (point.pinned)
                return;
            const vx = (point.x - point.oldX) * damping;
            const vy = (point.y - point.oldY) * damping;
            point.oldX = point.x;
            point.oldY = point.y;
            point.x += vx;
            point.y += vy + gravity;
            if (!pointer.active)
                return;
            const dx = point.x - pointer.x;
            const dy = point.y - pointer.y;
            const distance = Math.hypot(dx, dy);
            const isMobile = window.matchMedia('(pointer: coarse)').matches;
            const mobileMultiplier = isMobile ? 0.5 : 1;
            const radius = (pointer.down ? 120 : 60) * mobileMultiplier;
            const strength = (pointer.down ? 15 : 12) * mobileMultiplier;
            if (distance > 0 && distance < radius) {
                const force = (1 - distance / radius) * strength;
                point.x += (dx / distance) * force;
                point.y += (dy / distance) * force;
            }
        };
        const solveConstraint = (a, b) => {
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const distance = Math.hypot(dx, dy) || 1;
            const difference = segmentLength - distance;
            const percent = difference / distance / 2;
            const offsetX = dx * percent;
            const offsetY = dy * percent;
            if (!a.pinned) {
                a.x -= offsetX;
                a.y -= offsetY;
            }
            if (!b.pinned) {
                b.x += offsetX;
                b.y += offsetY;
            }
        };
        const update = () => {
            for (const stripe of stripes) {
                for (const point of stripe) {
                    updatePoint(point);
                }
                for (let i = 0; i < iterations; i++) {
                    for (let j = 0; j < stripe.length - 1; j++) {
                        solveConstraint(stripe[j], stripe[j + 1]);
                    }
                }
            }
        };
        const drawStripeTexture = (stripe) => {
            const dotRadius = clamp(1, lineWidth * textureDotRadiusRatio, lineWidth / 2);
            const dotSpacing = Math.max(dotRadius * 2.5, lineWidth * textureSpacingRatio);
            const restStripeLength = (stripe.length - 1) * segmentLength;
            const bottomPadding = dotRadius;
            ctx.beginPath();
            for (let distance = 0; distance <= restStripeLength - bottomPadding; distance += dotSpacing) {
                const segmentIndex = Math.min(Math.floor(distance / segmentLength), stripe.length - 2);
                const segmentProgress = (distance - segmentIndex * segmentLength) / segmentLength;
                const a = stripe[segmentIndex];
                const b = stripe[segmentIndex + 1];
                const dx = b.x - a.x;
                const dy = b.y - a.y;
                const x = a.x + dx * segmentProgress;
                const y = a.y + dy * segmentProgress;
                ctx.moveTo(x + dotRadius, y);
                ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
            }
            ctx.fill();
        };
        const drawTopStripe = () => {
            const firstStripe = stripes[0];
            const lastStripe = stripes[stripes.length - 1];
            if (!firstStripe || !lastStripe)
                return;
            const left = firstStripe[0].x - lineWidth / 2;
            const right = lastStripe[0].x + lineWidth / 2;
            ctx.fillRect(left, 0, right - left, lineWidth);
        };
        const draw = () => {
            const { width, height } = getSize();
            const stripeColor = '#fff'; // getCssVar(null, '--playground-body-color-text') || '#fff'
            ctx.clearRect(0, 0, width, height);
            ctx.lineWidth = lineWidth;
            ctx.strokeStyle = stripeColor;
            ctx.lineCap = 'square';
            ctx.fillStyle = stripeColor;
            for (const stripe of stripes) {
                ctx.beginPath();
                for (let i = 0; i < stripe.length; i++) {
                    const point = stripe[i];
                    if (i === 0) {
                        ctx.moveTo(point.x, point.y);
                    }
                    else {
                        ctx.lineTo(point.x, point.y);
                    }
                }
                ctx.stroke();
                ctx.save();
                ctx.fillStyle = '#000';
                ctx.globalCompositeOperation = 'destination-out';
                drawStripeTexture(stripe);
                ctx.restore();
            }
            ctx.fillStyle = stripeColor;
            drawTopStripe();
        };
        const tick = () => {
            update();
            draw();
            requestAnimationFrame(tick);
        };
        const setPointerFromClientPosition = (clientX, clientY) => {
            const rect = canvas.getBoundingClientRect();
            pointer.x = clientX - rect.left;
            pointer.y = clientY - rect.top;
            pointer.active = true;
        };
        hitZone.addEventListener('pointermove', (event) => {
            if (!this.interactive)
                return;
            setPointerFromClientPosition(event.clientX, event.clientY);
        });
        hitZone.addEventListener('pointerdown', (event) => {
            if (!this.interactive)
                return;
            setPointerFromClientPosition(event.clientX, event.clientY);
            pointer.down = true;
            hitZone.setPointerCapture(event.pointerId);
            hitZone.classList.add('top-7-21-hit-zone-active');
        });
        hitZone.addEventListener('pointerup', (event) => {
            if (!this.interactive)
                return;
            pointer.down = false;
            hitZone.releasePointerCapture(event.pointerId);
            hitZone.classList.remove('top-7-21-hit-zone-active');
        });
        hitZone.addEventListener('pointercancel', () => {
            if (!this.interactive)
                return;
            pointer.down = false;
            pointer.active = false;
        });
        hitZone.addEventListener('pointerleave', () => {
            if (!this.interactive)
                return;
            if (pointer.down)
                return;
            pointer.active = false;
        });
        const resizeObserver = new ResizeObserver(() => {
            resize();
        });
        resizeObserver.observe(container);
        resize();
        tick();
        button?.addEventListener('pointerdown', (event) => {
            setPointerFromClientPosition(event.clientX, event.clientY);
            pointer.down = true;
            this.interactive = true;
            window.setTimeout(() => {
                pointer.down = false;
            }, 123);
            window.setTimeout(() => {
                pointer.active = false;
            }, 234);
            this.handleStartButton();
        });
    },
    handleVideo(callback) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        window.onYouTubeIframeAPIReady = () => {
            this.ytPlayer = new YT.Player(this.el.videoContainer, {
                height: '100%',
                width: '100%',
                videoId: 'kJQP7kiw5Fk',
                playerVars: {
                    start: 0,
                    autoplay: 0,
                    controls: 1,
                    fs: 0,
                    iv_load_policy: 3,
                    loop: 1,
                    modestbranding: 1,
                    mute: 0,
                    playsinline: 1,
                    rel: 0,
                },
                events: {
                    onReady: () => {
                        if (!this.ytPlayerReady) {
                            this.ytPlayerReady = true;
                            callback();
                        }
                    },
                },
            });
        };
    },
    resizeContainer() {
        // Need this to reliably get the video height after it has loaded and is playing
        // and align it well with canvas stripes that go 100vw with side paddings
        const resize = () => {
            // const w = this.el.video.clientWidth
            const h = this.el.video?.clientHeight;
            gsap.set(this.el.container, { height: h });
        };
        resize();
        window.addEventListener('resize', resize);
    },
};
Component.init();
