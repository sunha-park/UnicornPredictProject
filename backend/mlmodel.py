import pandas as pd
import mysql.connector
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import MinMaxScaler
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout
from sklearn.metrics import r2_score, precision_score, recall_score, f1_score
from tensorflow.keras.optimizers import Adam
import numpy as np
import joblib

# 데이터베이스 연결 설정
db_config = {
    "host": "localhost",  # 데이터베이스 주소
    "user": "sunha",   # 사용자 이름
    "password": "1234",   # 비밀번호
    "database": "backend" # 데이터베이스 이름
}

def load_data_from_db():
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)
        query = "SELECT year, company, asset, debt, capital, income, cost, profit, net_income, investment, unicorn FROM unicorn"
        cursor.execute(query)
        data = cursor.fetchall()
        df = pd.DataFrame(data)
        cursor.close()
        conn.close()
        return df
    except mysql.connector.Error as e:
        print(f"Database connection error: {e}")
        return None

# 데이터 로드
df = load_data_from_db()
if df is None:
    print("Failed to load data from database.")
else:
    print("Data loaded successfully from database.")

# NaN 값 확인
print("NaN 값 개수:\n", df.isnull().sum())

# NaN 값 처리
df = df.dropna()  # NaN 값이 있는 행을 제거

# 입력 변수(X)와 목표 변수(y) 설정
X = df[['year', 'asset', 'debt', 'capital', 'income', 'cost', 'profit', 'net_income', 'investment']]
y = df['unicorn']

# 독립 변수 및 종속 변수 설정
features = ['year', 'asset', 'debt', 'capital', 'income', 'cost', 'profit', 'net_income', 'investment']
target = 'unicorn'

# 데이터 정규화
scaler = MinMaxScaler()
df[features] = scaler.fit_transform(df[features])

# 시계열 데이터로 변환
def create_sequences(data, features, target, time_steps=5):
    sequences = []
    labels = []
    companies = data['company'].unique()
    for company in companies:
        company_data = data[data['company'] == company]
        for i in range(len(company_data) - time_steps + 1):
            seq = company_data[features].iloc[i:i+time_steps].values
            label = company_data[target].iloc[i+time_steps-1]
            sequences.append(seq)
            labels.append(label)
    return np.array(sequences), np.array(labels)

time_steps = 5
X, y = create_sequences(df, features, target, time_steps)

# 데이터 셋 분리
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)

model = Sequential([
    LSTM(32, activation='relu', input_shape=(time_steps, len(features))),
    Dropout(0.2),
    Dense(16, activation='relu'),
    Dense(1, activation='sigmoid')
])

# 모델 컴파일
model.compile(optimizer=Adam(learning_rate=0.001), loss='binary_crossentropy', metrics=['accuracy'])

# 모델 학습
history = model.fit(X_train, y_train, epochs=100, batch_size=8, verbose=1, validation_data=(X_test, y_test))

# 모델 평가
loss, accuracy = model.evaluate(X_test, y_test)
print(f"Test Loss: {loss:.4f}, Test Accuracy: {accuracy:.4f}")

# 테스트 데이터로 예측 수행
y_pred_prob = model.predict(X_test).flatten()  # 확률값 (0~1)
y_pred = (y_pred_prob > 0.5).astype(int)  # 0.5 기준으로 이진화

# R² 결정계수 계산
r2 = r2_score(y_test, y_pred_prob)  # 확률값과 실제 라벨 비교
print(f"테스트 데이터에 대한 결정계수 (R²): {r2:.2f}")

# 모델 저장
model.save("./lstm_pm25_model.h5")
print("모델이 'lstm_pm25_model.h5' 파일로 저장되었습니다.")

# 스케일러 저장
joblib.dump(scaler, "./scaler_X.pkl")  # 입력 변수 스케일러 저장
print("Scaler objects saved successfully!")

