document.addEventListener('DOMContentLoaded', () => {
    const allRoulettesContainer = document.getElementById('allRoulettesContainer');
    const addRouletteButton = document.getElementById('addRouletteButton');
    const LOCAL_STORAGE_KEY_PREFIX = 'rouletteItems_'; // 룰렛별 고유 키를 위한 접두사

    let rouletteInstances = []; // 모든 룰렛 인스턴스를 저장할 배열
    let nextRouletteId = 0; // 룰렛 ID를 위한 카운터

    const colors = [
        '#FFD700', '#FF6347', '#6A5ACD', '#3CB371', '#87CEEB',
        '#FF69B4', '#FFA07A', '#BA55D3', '#00CED1', '#F0E68C',
        '#ADFF2F', '#FF4500', '#DA70D6', '#20B2AA', '#7B68EE',
        '#FFC0CB', '#98FB98', '#ADD8E6', '#DDA0DD', '#FFDEAD'
    ];

    // 룰렛 클래스 정의
    class Roulette {
        constructor(id) {
            this.id = id;
            this.items = [];
            this.isSpinning = false;

            this.createElements();
            this.loadItems(); // 로컬 스토리지에서 항목 로드
            this.renderItems(); // 로드된 항목으로 렌더링
            this.addEventListeners();
        }

        // 룰렛 관련 DOM 요소들을 생성하고 컨테이너에 추가
        createElements() {
            this.container = document.createElement('div');
            this.container.classList.add('roulette-instance-container');
            this.container.dataset.rouletteId = this.id; // 데이터 ID 설정

            this.container.innerHTML = `
                <button class="delete-roulette-button">X</button>
                <h2>룰렛 ${this.id + 1}</h2>
                <div class="input-section">
                    <input type="text" class="roulette-item-input" placeholder="항목 입력">
                    <button class="add-item-button">추가</button>
                </div>
                <div class="item-list-section">
                    <h3>항목 목록</h3>
                    <ul class="item-list"></ul>
                </div>
                <button class="spin-button">룰렛 돌리기!</button>
                <div class="result-section">
                    <h3>결과</h3>
                    <div class="roulette-display-area">
                        <div class="roulette-wheel"></div>
                        <div class="marker"></div>
                    </div>
                    <p class="result-text">룰렛을 돌려보세요!</p>
                </div>
            `;
            allRoulettesContainer.appendChild(this.container);

            // 요소 참조
            this.rouletteItemInput = this.container.querySelector('.roulette-item-input');
            this.addItemButton = this.container.querySelector('.add-item-button');
            this.itemList = this.container.querySelector('.item-list');
            this.spinButton = this.container.querySelector('.spin-button');
            this.rouletteWheel = this.container.querySelector('.roulette-wheel');
            this.resultText = this.container.querySelector('.result-text');
            this.deleteRouletteButton = this.container.querySelector('.delete-roulette-button');
        }

        // 이벤트 리스너 추가
        addEventListeners() {
            this.addItemButton.addEventListener('click', () => this.addItem());
            this.rouletteItemInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.addItem();
                }
            });
            this.spinButton.addEventListener('click', () => this.spinRoulette());
            this.deleteRouletteButton.addEventListener('click', () => this.deleteRoulette());
        }

        // 로컬 스토리지에서 항목 불러오기
        loadItems() {
            const storedItems = localStorage.getItem(LOCAL_STORAGE_KEY_PREFIX + this.id);
            if (storedItems) {
                this.items = JSON.parse(storedItems);
            }
        }

        // 로컬 스토리지에 항목 저장하기
        saveItems() {
            localStorage.setItem(LOCAL_STORAGE_KEY_PREFIX + this.id, JSON.stringify(this.items));
        }

        // 항목 목록을 화면에 렌더링하는 함수
        renderItems() {
            this.itemList.innerHTML = '';
            this.items.forEach((item, index) => {
                const listItem = document.createElement('li');
                listItem.textContent = item;
                listItem.style.setProperty('--animation-order', `${index * 0.05}s`);

                const deleteButton = document.createElement('button');
                deleteButton.textContent = 'X';
                deleteButton.classList.add('delete-btn');
                deleteButton.addEventListener('click', () => {
                    listItem.classList.add('fade-out');
                    listItem.addEventListener('animationend', () => {
                        this.deleteItem(index);
                    }, { once: true });
                });

                listItem.appendChild(deleteButton);
                this.itemList.appendChild(listItem);
            });
            this.updateRouletteWheel();
            this.saveItems();
        }

        // 항목 추가 함수
        addItem() {
            const item = this.rouletteItemInput.value.trim();
            if (item && !this.items.includes(item)) {
                this.items.push(item);
                this.rouletteItemInput.value = '';
                this.renderItems();
                this.resultText.textContent = '룰렛을 돌려보세요!';
            } else if (this.items.includes(item)) {
                alert('이미 같은 항목이 룰렛에 있습니다!');
            } else {
                alert('룰렛에 추가할 항목을 입력해주세요!');
            }
        }

        // 항목 삭제 함수
        deleteItem(index) {
            this.items.splice(index, 1);
            this.renderItems();
            this.resultText.textContent = '룰렛을 돌려보세요!';
        }

        // 룰렛 휠을 동적으로 생성하고 업데이트하는 함수 - ★ 핵심 수정 부분 ★
        updateRouletteWheel() {
            this.rouletteWheel.innerHTML = ''; // 기존 세그먼트 (텍스트 포함) 초기화

            if (this.items.length === 0) {
                this.rouletteWheel.style.background = '#ddd';
                return;
            }

            const anglePerItem = 360 / this.items.length;
            let gradientString = 'conic-gradient(from 0deg';

            // 룰렛 배경 (conic-gradient) 생성
            let currentAngle = 0;
            this.items.forEach((item, index) => {
                const startAngle = currentAngle;
                const endAngle = currentAngle + anglePerItem;
                
                const colorIndex = index % colors.length;
                gradientString += `, ${colors[colorIndex]} ${startAngle}deg ${endAngle}deg`;
                currentAngle = endAngle;
            });
            gradientString += ')';
            this.rouletteWheel.style.background = gradientString;


            // 텍스트를 포함하는 개별 세그먼트 요소 생성 및 배치
            this.items.forEach((item, index) => {
                const segment = document.createElement('div');
                segment.classList.add('roulette-segment');
                
                // 각 세그먼트 요소 자체를 회전시켜 해당 조각의 중심 방향으로 이동
                // 이 각도는 룰렛 휠의 시작 각도에서 각 조각의 중간 각도까지를 나타냄
                const segmentRotation = anglePerItem * index + (anglePerItem / 2);
                segment.style.transform = `rotate(${segmentRotation}deg)`;

                const itemText = document.createElement('div');
                itemText.classList.add('roulette-item-text');
                itemText.textContent = item;
                
                // 텍스트가 항상 똑바로 보이도록 조절하는 회전 각도
                // segment 자체의 회전과 상쇄시키기 위해 반대 방향으로 회전
                itemText.style.setProperty('--text-rotation', `-${segmentRotation}deg`);

                segment.appendChild(itemText);
                this.rouletteWheel.appendChild(segment);
            });
            
            if (this.items.length === 1) {
                this.rouletteWheel.style.background = colors[0];
            }
        }

        // 룰렛 돌리기 함수
        spinRoulette() {
            if (this.items.length === 0) {
                alert('룰렛 항목이 없습니다. 항목을 추가해주세요!');
                return;
            }
            if (this.items.length === 1) {
                this.resultText.textContent = `🎉 ${this.items[0]} 🎉`;
                return;
            }
            if (this.isSpinning) return;

            this.isSpinning = true;
            this.spinButton.disabled = true;
            this.resultText.textContent = '룰렛이 돌아가고 있어요...';

            this.rouletteWheel.style.transition = 'none';
            this.rouletteWheel.style.transform = 'rotate(0deg)'; 
            void this.rouletteWheel.offsetWidth; 

            setTimeout(() => {
                const randomIndex = Math.floor(Math.random() * this.items.length);
                const anglePerItem = 360 / this.items.length;
                
                // 멈출 각도 계산
                // 마커는 룰렛의 0도 (맨 위)에 위치합니다.
                // 룰렛이 멈출 정확한 각도: 선택된 항목의 시작 각도 + 항목의 중간 각도
                const targetAngleForStop = randomIndex * anglePerItem + (anglePerItem / 2);

                // 룰렛이 마커에 오도록 하려면 (360 - 룰렛의 시작 각도) 만큼 회전해야 합니다.
                // (룰렛은 시계 방향으로 회전하고, 마커는 0도(위)에 있습니다.)
                // 즉, 마커에 오려면 (360 - 현재 룰렛이 회전한 각도) 가 되어야 합니다.
                // 그런데 룰렛은 0도에서 시작하므로, 멈출 각도는 (360 - targetAngleForStop)이 됩니다.
                // 여기에 여러 바퀴를 더해줍니다.
                let stopAngle = 360 * 5 + (360 - targetAngleForStop); 
                
                // 약간의 무작위성을 더해 매번 똑같은 위치에 멈추지 않게 함 (약 -5도 ~ +5도 사이)
                stopAngle += (Math.random() * 10 - 5); 

                this.rouletteWheel.style.transition = 'transform 4s cubic-bezier(0.25, 0.1, 0.25, 1)';
                this.rouletteWheel.style.transform = `rotate(${stopAngle}deg)`;

                this.rouletteWheel.addEventListener('transitionend', () => {
                    this.isSpinning = false;
                    this.spinButton.disabled = false;
                    this.resultText.textContent = `🎉 ${this.items[randomIndex]} 🎉`;
                    
                    const finalRotation = stopAngle % 360;
                    this.rouletteWheel.style.transition = 'none';
                    this.rouletteWheel.style.transform = `rotate(${finalRotation}deg)`;
                }, { once: true });
            }, 50);
        }

        // 룰렛 삭제 함수
        deleteRoulette() {
            if (confirm('이 룰렛을 정말 삭제하시겠습니까?')) {
                this.container.remove(); // DOM에서 룰렛 컨테이너 제거
                localStorage.removeItem(LOCAL_STORAGE_KEY_PREFIX + this.id); // 로컬 스토리지에서도 삭제
                // rouletteInstances 배열에서 이 룰렛 제거
                rouletteInstances = rouletteInstances.filter(r => r.id !== this.id);
            }
        }
    }

    // 새 룰렛을 생성하고 배열에 추가하는 함수
    const createNewRoulette = () => {
        const newRoulette = new Roulette(nextRouletteId++);
        rouletteInstances.push(newRoulette);
    };

    // 페이지 로드 시 기존 룰렛들 불러오기
    const loadAllRoulettes = () => {
        // 로컬 스토리지에 저장된 모든 룰렛 ID를 찾아 로드
        const rouletteIds = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith(LOCAL_STORAGE_KEY_PREFIX)) {
                const id = parseInt(key.replace(LOCAL_STORAGE_KEY_PREFIX, ''));
                if (!isNaN(id)) {
                    rouletteIds.push(id);
                }
            }
        }
        
        // ID 순서대로 룰렛 생성
        rouletteIds.sort((a, b) => a - b).forEach(id => {
            const roulette = new Roulette(id);
            rouletteInstances.push(roulette);
            // nextRouletteId를 가장 큰 ID보다 크게 설정하여 중복 방지
            if (id >= nextRouletteId) {
                nextRouletteId = id + 1;
            }
        });

        // 만약 로드된 룰렛이 하나도 없다면, 기본 룰렛 하나 생성
        if (rouletteInstances.length === 0) {
            createNewRoulette();
        }
    };

    // '새 룰렛 만들기' 버튼 이벤트 리스너
    addRouletteButton.addEventListener('click', createNewRoulette);

    // 초기 로딩 시 모든 룰렛 불러오기
    loadAllRoulettes();
});