from flask import Flask, request, jsonify
from flask_cors import CORS, cross_origin
import mysql.connector
import joblib
import pandas as pd
from datetime import datetime, timedelta
import numpy as np
from tensorflow.keras.models import load_model
from tensorflow.keras.optimizers import Adam
import joblib
from flask import make_response
from collections import OrderedDict

# Flask 앱 생성 및 CORS 설정
app = Flask(__name__)
CORS(app)

# 임시 저장소
predictions_cache = {}

# 데이터베이스 연결 설정
def get_db_connection():
    try:
        return mysql.connector.connect(
            host='localhost',
            user='sunha',
            password='1234',
            database='backend'
        )
    except mysql.connector.Error as err:
        print(f"Database connection error: {err}")
        raise  # 예외를 재발생시켜 호출부에서 처리 가능

def reset_new_unicorn_table():
    try:
        # 데이터베이스 연결
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

         # 테이블 삭제 및 생성
        print("Attempting to reset `new_unicorn` table...")
        reset_table_query = """
        DROP TABLE IF EXISTS new_unicorn;

        CREATE TABLE new_unicorn (
            id INT AUTO_INCREMENT PRIMARY KEY,
            year INT NOT NULL,
            company VARCHAR(255) NOT NULL,
            asset FLOAT NOT NULL,
            debt FLOAT NOT NULL,
            capital FLOAT NOT NULL,
            income FLOAT NOT NULL,
            cost FLOAT NOT NULL,
            profit FLOAT NOT NULL,
            net_income FLOAT NOT NULL,
            investment FLOAT NOT NULL
        );
        """
        # 다중 쿼리 실행
        for query in reset_table_query.split(";"):
            if query.strip():
                cursor.execute(query)

        conn.commit()  # 트랜잭션 커밋
        print("`new_unicorn` table reset successfully.")

    except Exception as e:
        print(f"Error resetting `new_unicorn` table: {e}")
        raise

    finally:
        if conn:
            cursor.close()
            conn.close()


# PM2.5 예측 API
@app.route('/predict', methods=['GET'])
def predict():
    try:
        # 학습된 모델 및 스케일러 로드
        model = load_model("lstm_pm25_model.h5")
        scaler_X = joblib.load("scaler_X.pkl")

        # 데이터베이스에서 최근 데이터 로드
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT year, company, asset, debt, capital, income, cost, profit, net_income, investment FROM new_unicorn")
        rows = cursor.fetchall()
        conn.close()

        # 데이터가 충분한지 확인
        if len(rows) < 5:
            return jsonify({'error': 'Not enough data to make predictions. At least 5 rows are required.'}), 400

        # 데이터를 pandas DataFrame으로 변환 및 연도 기준으로 정렬 (내림차순) 후 최신 연도에서 5개 데이터 선택
        new_data = pd.DataFrame(rows)
        new_data = new_data.sort_values(by='year', ascending=False).head(5).sort_values(by='year')

        # 모델 입력에 사용할 특징 선택
        features = ['year', 'asset', 'debt', 'capital', 'income', 'cost', 'profit', 'net_income', 'investment']
        features_data = new_data[features].values

        # 스케일링
        features_data_scaled = scaler_X.transform(features_data)
        print(f"features_data_scaled shape: {features_data_scaled.shape}")
        input_sequence = features_data_scaled.reshape(1, 5, len(features))  # (1, time_steps, num_features)

        # 예측 수행
        predicted_probability = float(model.predict(input_sequence)[0][0])  # float 변환
        is_unicorn = int(predicted_probability > 0.5)  # 0.5 기준으로 이진화

        # 예측 결과 반환
        return jsonify({
            'success': True,
            'predicted_probability': round(predicted_probability, 2),
            'is_unicorn': bool(is_unicorn),
            'message': 'Prediction completed successfully.'
        }), 200

    except Exception as e:
        print(f"Error in /predict API: {e}")
        return jsonify({'error': str(e)}), 500

# 엑셀 파일로 데이터 업로드
@app.route('/insert_new_excel', methods=['POST'])
def upload_new_excel():
    file = request.files.get('file')
    if not file:
        return jsonify({'error': 'No file provided'}), 400
    
    try:
        # 테이블 리셋
        reset_new_unicorn_table()
        print("Table reset complete.")

        # 엑셀 파일 읽기
        data = pd.read_excel(file)

        required_fields = ['year', 'company', 'asset', 'debt', 'capital', 'income', 'cost', 'profit', 'net_income', 'investment']
        if not all(field in data.columns for field in required_fields):
            return jsonify({'error': 'Invalid file format. Required fields missing.'}), 400

        # 데이터베이스 연결
        conn = get_db_connection()
        cursor = conn.cursor()

        for _, row in data.iterrows():
            sql = """
            INSERT INTO new_unicorn (year, company, asset, debt, capital, income, cost, profit, net_income, investment)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            cursor.execute(sql, tuple(row))

        conn.commit()
        print("Data inserted successfully into `new_unicorn` table.")
        return jsonify({'message': '파일 업로드 성공!'}), 200

    except Exception as e:
        print(f"Error in /insert_new_excel API: {e}")
        return jsonify({'error': str(e)}), 500

    finally:
        if conn:
            cursor.close()
            conn.close()

# 데이터 입력 폼
@app.route('/insert_data', methods=['POST'])
def insert_data():
    try:
        # 요청으로부터 JSON 데이터를 가져오기
        data = request.get_json()

        # 필수 컬럼 정의
        required_fields = ['year', 'company', 'asset', 'debt', 'capital', 'income', 'cost', 'profit', 'net_income', 'investment']
        
        # 데이터 유효성 검사
        for field in required_fields:
            if field not in data or data[field] is None:
                return jsonify({'error': f'Missing field: {field}'}), 400

        # MariaDB 연결
        conn = get_db_connection()
        cursor = conn.cursor()

        # SQL 삽입 쿼리
        sql = """
            INSERT INTO new_unicorn (year, company, asset, debt, capital, income, cost, profit, net_income, investment)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        cursor.execute(sql, (
            data['year'],
            data['company'],
            data['asset'],
            data['debt'],
            data['capital'],
            data['income'],
            data['cost'],
            data['profit'],
            data['net_income'],
            data['investment']
        ))
        conn.commit()
        conn.close()

        return jsonify({'message': 'Data inserted successfully'}), 200

    except Exception as e:
        print(f"Error in insert_data API: {e}")
        return jsonify({'error': str(e)}), 500


# 업로드된 데이터를 반환하는 API
@app.route('/fetch_uploaded_data', methods=['GET'])
def fetch_uploaded_data():
    try:
        conn = get_db_connection()
        query = "SELECT id, year, company, asset, debt, capital, income, cost, profit, net_income, investment FROM new_unicorn"
        data = pd.read_sql(query, conn)
        conn.close()

        # 3자리 단위로 쉼표를 추가
        numeric_columns = ['asset', 'debt', 'capital', 'income', 'cost', 'profit', 'net_income', 'investment']
        for col in numeric_columns:
            data[col] = data[col].apply(lambda x: f"{x:,.0f}" if pd.notnull(x) else None)

        # 데이터프레임을 JSON으로 변환 (순서 보존)
        data_json = data.to_dict(orient='records')
        return jsonify({'data': data_json}), 200
    except Exception as e:
        print(f"Error fetching data: {e}")
        return jsonify({'error': str(e)}), 500

# 데이터 행별로 체크박스 선택해서 삭제
@app.route('/delete_rows', methods=['POST'])
def delete_rows():
    data = request.get_json()
    print("Received IDs:", data.get('ids'))  # 요청 데이터 확인
    ids_to_delete = data.get('ids', [])
    if not ids_to_delete:
        return jsonify({"success": False, "message": "No IDs provided for deletion."}), 400

    try:
         # 데이터베이스 연결
        conn = get_db_connection()
        cursor = conn.cursor()

       # 삭제 쿼리 실행 (id 값을 개별적으로 처리)
        query = f"DELETE FROM new_unicorn WHERE id IN ({','.join(['%s'] * len(ids_to_delete))})"
        cursor.execute(query, ids_to_delete)  # ids_to_delete를 직접 바인딩
        conn.commit()

        return jsonify({'success': True, 'message': 'Rows deleted successfully.'})
    except Exception as e:
        print(f"Error during deletion: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        # 연결 닫기
        cursor.close()
        conn.close()


# # API: 데이터와 예측값 반환
# @app.route('/all_data', methods=['GET'])
# def get_all_data():
#     try:
#         # 데이터베이스에서 실제값 로드
#         conn = get_db_connection()
#         cursor = conn.cursor(dictionary=True)
#         cursor.execute("SELECT year, company, asset, debt, capital, income, cost, profit, net_income, investment, unicorn FROM unicorn")
#         rows = cursor.fetchall()

#         return jsonify({
#             'data': rows
#         }), 200
#     except Exception as e:
#         print(f"Error in /all_data API: {e}")
#         return jsonify({'error': str(e)}), 500
    
    
   
# @app.route('/save_data', methods=['POST'])
# def save_data():
#     data = request.json
#     conn = None  # 초기값 설정

#     try:
#         conn = get_db_connection()
#         cursor = conn.cursor()
#         sql = """
#         INSERT INTO unicorn (year, company, asset, debt, capital, income, cost, profit, net_income, investment, unicorn)
#         VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
#         """
#         cursor.execute(sql, (data['year'], data['company'], data['asset'], data['debt'], data['capital'],
#                              data['income'], data['cost'], data['profit'], data['net_income'], data['investment'], data['unicorn']))
#         conn.commit()
#         return jsonify({'message': '저장완료'}), 200
#     except Exception as e:
#         return jsonify({'error': str(e)}), 500
#     finally:
#         if conn:  # 연결 객체가 있는 경우에만 닫음
#             conn.close()


# @app.route('/insert_excel', methods=['POST'])
# def upload_excel():
#     file = request.files.get('file')
#     if not file:
#         return jsonify({'error': 'No file provided'}), 400

#     conn = None  # 초기값 설정
#     try:
#         # 엑셀 파일 읽기
#         data = pd.read_excel(file)

#         required_fields = ['year', 'company', 'asset', 'debt', 'capital', 'income', 'cost', 'profit', 'net_income', 'investment', 'unicorn']
#         if not all(field in data.columns for field in required_fields):
#             return jsonify({'error': 'Invalid file format. Required fields missing.'}), 400

#         # 데이터베이스 연결
#         conn = get_db_connection()
#         cursor = conn.cursor()

#         for _, row in data.iterrows():
#             sql = """
#             INSERT INTO unicorn (year, company, asset, debt, capital, income, cost, profit, net_income, investment, unicorn)
#             VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
#             """
#             cursor.execute(sql, tuple(row))

#         conn.commit()
#         return jsonify({'message': '파일 업로드 성공!'}), 200
#     except Exception as e:
#         return jsonify({'error': str(e)}), 500
#     finally:
#         if conn:  # 연결 객체가 있는 경우에만 닫음
#             conn.close()


# @app.route('/delete_excel', methods=['POST'])
# def delete_excel():
#     file = request.files.get('file')
#     if not file:
#         return jsonify({'error': 'No file provided'}), 400

#     conn = None  # 초기값 설정
#     try:
#         # 엑셀 파일 읽기
#         data = pd.read_excel(file)

#         # 데이터 유효성 검사
#         if 'company' not in data.columns:
#             return jsonify({'error': 'Invalid file format. company column is missing'}), 400

#         conn = get_db_connection()
#         cursor = conn.cursor()

#         for _, row in data.iterrows():
#             sql = "DELETE FROM unicorn WHERE company = %s"
#             cursor.execute(sql, (row['company'],))

#         conn.commit()
#         return jsonify({'message': '데이터 삭제 성공!'}), 200
#     except Exception as e:
#         return jsonify({'error': str(e)}), 500
#     finally:
#         if conn:  # 연결 객체가 있는 경우에만 닫음
#             conn.close()



# Flask 앱 실행
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)


