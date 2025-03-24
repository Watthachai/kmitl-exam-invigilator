

def predict_resp(txt):
    """Predict response based on the input text."""
    p_data = get_ner(txt)
    return process_data(p_data)


# --- Stock Management and Order Updates ---

def validate_input(data, required_keys):
    """Validates input data."""
    for key in required_keys:
        if key not in data or not data[key]:
            return False, f"{key} is required!"
    return True, ""

def stock_manager(menu_id, qty):
    """Manages stock updates for ingredients and ingredient packs."""
    try:
        print("📦 เริ่มระบบ stock_manager...")

        # --- 1. Manage stock for individual ingredients (menuingredients) ---
        print(f"🔍 ดึงวัตถุดิบเดี่ยวของ menu_id: {menu_id}")
        menu_ingredients = db.session.execute(
            text("SELECT ingredient_id, volume FROM menuingredients WHERE menu_id = :menu_id"),
            {"menu_id": menu_id}
        ).mappings().fetchall()

        if not menu_ingredients:
            print("⚠️ ไม่พบข้อมูลใน menuingredients")

        ingredient_ids = [ingredient["ingredient_id"] for ingredient in menu_ingredients]

        ingredient_stocks = []
        if ingredient_ids:
            ingredient_stocks = db.session.execute(
                text(f"SELECT Ingredients_id, main_stock FROM ingredients WHERE Ingredients_id IN ({', '.join(map(str, ingredient_ids))})")
            ).mappings().fetchall()

        stock_dict = {item["Ingredients_id"]: item["main_stock"] for item in ingredient_stocks}

        for ingredient in menu_ingredients:
            ingredient_id = ingredient["ingredient_id"]
            volume = ingredient["volume"]
            if ingredient_id in stock_dict:
                used_amount = volume * qty
                new_stock = stock_dict[ingredient_id] - used_amount
                print(f"→ ลด stock วัตถุดิบ id {ingredient_id}: -{used_amount}, คงเหลือใหม่: {new_stock}")

                db.session.execute(
                    text("UPDATE ingredients SET main_stock = :new_stock WHERE Ingredients_id = :ingredient_id"),
                    {"new_stock": new_stock, "ingredient_id": ingredient_id}
                )
            else:
                print(f"❗ ไม่พบ ingredient_id {ingredient_id} ใน stock")
                return {"status": 404, "message": f"Ingredient with id {ingredient_id} not found!"}

        # --- 2. Manage stock for ingredient packs (menuingredientpack) ---
        print(f"🔍 ดึงวัตถุดิบแบบ Pack ของ menu_id: {menu_id}")
        menu_ingredient_packs = db.session.execute(
            text("SELECT ingredient_pack_id, qty FROM menuingredientpack WHERE menu_id = :menu_id"),
            {"menu_id": menu_id}
        ).mappings().fetchall()

        if not menu_ingredient_packs:
            print("⚠️ ไม่พบข้อมูลใน menuingredientpack")

        pack_ids = [pack["ingredient_pack_id"] for pack in menu_ingredient_packs]

        ingredient_pack_stocks = []
        if pack_ids:

            # ingredient_pack_stocks = db.session.execute(
            #         text("SELECT id, stock FROM ingredientpackitems WHERE pack_id IN (:pack_ids)"),  # Corrected table name
            #         {"pack_ids": pack_ids}  # Use a dictionary for parameters
            #     ).mappings().fetchall()
            
            ingredient_pack_stocks = db.session.execute(
                text(f"SELECT id, stock FROM ingredientpack WHERE id IN ({', '.join(map(str, pack_ids))})")
            ).mappings().fetchall()

        pack_stock_dict = {item["id"]: item["stock"] for item in ingredient_pack_stocks}

        for pack in menu_ingredient_packs:
            pack_id = pack["ingredient_pack_id"]
            pack_qty = pack["qty"]
            if pack_id in pack_stock_dict:
                used_amount = pack_qty * qty
                new_stock = pack_stock_dict[pack_id] - used_amount
                print(f"→ ลด stock Pack id {pack_id}: -{used_amount}, คงเหลือใหม่: {new_stock}")

                db.session.execute(
                    text("UPDATE ingredientpack SET stock = :new_stock WHERE id = :pack_id"),
                    {"new_stock": new_stock, "pack_id": pack_id}
                )
            else:
                print(f"❗ ไม่พบ ingredient_pack_id {pack_id} ใน stock")
                return {"status": 404, "message": f"Ingredient Pack with id {pack_id} not found!"}

        db.session.commit()
        print("✅ stock_manager ทำงานสำเร็จทั้งหมด")
        return {"status": 200, "message": "Stock has been successfully updated!"}

    except SQLAlchemyError as e:
        db.session.rollback()
        print(f"❌ Database Error: {str(e)}")
        return {"status": 500, "message": f"Database Error: {str(e)}"}
    except Exception as e:
        db.session.rollback()
        print(f"❌ Unexpected Error: {str(e)}")
        return {"status": 500, "message": f"Unexpected Error: {str(e)}"}


def change_status_order(ai_data):
    """Changes the status of an order item based on AI input."""
    try:
        print("❤❤❤ เริ่มต้นเปลี่ยนสถานะคำสั่งซื้อ ❤❤❤")
        print(f"Data received from AI: {ai_data}")

        required_keys = ['TABLE', 'COMMAND', 'FOOD']
        valid, message = validate_input(ai_data, required_keys)
        if not valid:
            return jsonify({"message": message}), 400

        table_id = ai_data['TABLE'][0]
        command_type = ai_data['COMMAND']
        food_name = ai_data['FOOD'][0]

        if command_type not in ['COMMAND_1', 'COMMAND_2']:
            return jsonify({"message": "'command_type' must be either 'COMMAND_1' or 'COMMAND_2'!"}), 400

        # Find menu_id from food_name
        menu = db.session.execute(
            text("SELECT id FROM menu WHERE name = :food_name"),
            {"food_name": food_name}
        ).mappings().fetchone()

        if not menu:
            return jsonify({"message": "Food not found in menu!"}), 404

        menu_id = menu['id']

        # Find order_id from table_id
        order_query = db.session.query(Order).filter_by(table_id=table_id, status_order=0).first()  # Assuming status 0 is active
        if not order_query:
            return jsonify({"message": f"No active order found for table {table_id}"}), 404

        order_id = order_query.order_id

        # Find existing status_order
        existing_status_result = db.session.execute(
            text("SELECT status_order FROM orderitem WHERE menu_id = :menu_id AND order_id = :order_id"),
            {"menu_id": menu_id, "order_id": order_id}
        ).mappings().fetchone()


        if not existing_status_result:
             return jsonify({"message": "Order item not found!"}), 404

        current_status = existing_status_result["status_order"]
        print(f"สถานะเดิมของ orderitem: {current_status}")

        # Map command to new status
        status_mapping = {'COMMAND_1': 1, 'COMMAND_2': 2}
        new_status = status_mapping.get(command_type)

        # Check for status reduction (not allowed)
        if new_status <= current_status:
            return jsonify({"message": "ไม่อนุญาตให้ลดสถานะของคำสั่งซื้อ!"}), 400

        # Update status
        db.session.execute(
            text("UPDATE orderitem SET status_order = :status WHERE menu_id = :menu_id AND order_id = :order_id"),
            {"status": new_status, "menu_id": menu_id, "order_id": order_id}
        )
        db.session.commit()

        print("✅ อัปเดตสถานะสำเร็จ!")

        # Get qty for stock_manager
        qty_result = db.session.execute(
            text("SELECT menu_qty FROM orderitem WHERE menu_id = :menu_id AND order_id = :order_id"),
            {"menu_id": menu_id, "order_id": order_id}
        ).mappings().fetchone()

        if not qty_result:
            print("ไม่พบจำนวน qty ของ orderitem")
            return jsonify({"message": "ไม่พบจำนวน qty ของ orderitem"}), 404

        qty = qty_result["menu_qty"]

        # Call stock_manager
        stock_result = stock_manager(menu_id, qty)

        if stock_result["status"] != 200:
            print("Status updated, but stock error occurred!")
            return jsonify({"message": "Status updated, but stock error occurred!", "stock_result": stock_result}), 500

        print("Status updated successfully")
        return jsonify({"message": "Status updated successfully", "stock_result": stock_result}), 200

    except SQLAlchemyError as e:
        db.session.rollback()
        print(f"SQLAlchemyError: {e}")
        return jsonify({"message": str(e)}), 500
    except Exception as e:
        print(f"Exception: {e}")
        return jsonify({"message": str(e)}), 500


# --- Main Audio Upload Endpoint ---

@cross_origin(supports_credentials=True)
def upload_audio():
    """Handles audio file uploads, conversion, and processing."""
    if "file" not in request.files:
        return jsonify({"error": "No file part"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    temp_upload_path = os.path.join(OUTPUT_DIR, file.filename)
    fixed_wav_path = os.path.join(OUTPUT_DIR, "speech.wav")

    try:
        with open(temp_upload_path, "wb") as f:
            f.write(file.read())
        print(f"File uploaded to: {temp_upload_path}")

        # Use ffmpeg to check file type (more robust than relying on filename extension)
        ffmpeg_check_cmd = ["ffmpeg", "-i", temp_upload_path]
        result = subprocess.run(ffmpeg_check_cmd, stderr=subprocess.PIPE, text=True)

        if "matroska,webm" in result.stderr or "opus" in result.stderr:
            print("⚠️ Detected WebM/Opus file, converting to WAV...")
            convert_cmd = [
                "ffmpeg", "-y", "-i", temp_upload_path,
                "-acodec", "pcm_s16le",  # Ensure consistent WAV format
                "-ar", "44100",        # Standard sample rate
                "-ac", "2",             # Stereo (optional, but good for consistency)
                fixed_wav_path
            ]
            subprocess.run(convert_cmd, check=True)  # Raise exception on error
            print(f"✅ Converted to WAV: {fixed_wav_path}")
            audio_wav = fixed_wav_path

        elif "mp3" in result.stderr.lower():  # added .lower() to fix
             print("✅ File is a real MP3, converting MP3 to WAV...")
             audio = AudioSegment.from_file(temp_upload_path, format="mp3")
             audio.export(fixed_wav_path, format="wav", parameters=["-acodec", "pcm_s16le"])
             print(f"✅ Exported WAV file: {fixed_wav_path}")
             audio_wav = fixed_wav_path
        else:
            return jsonify({"error": "Unsupported file format"}), 400 # check support file

        text = recognize_audio(audio_wav)
        text_new = convert_text(text)
        result_data = predict_resp(text_new)

        # Call change_status_order and return its result
        return change_status_order(result_data)


    except subprocess.CalledProcessError as e:
        print(f"❌ FFmpeg error: {e}")
        return jsonify({"error": "FFmpeg conversion failed", "details": str(e)}), 500
    except Exception as e:
        print(f"❌ Error during processing: {e}")
        return jsonify({"error": "An error occurred during processing", "details": str(e)}), 500
    finally:
        # Clean up temporary files (optional, but good practice)
        try:
            os.remove(temp_upload_path)
            # Only remove fixed_wav_path if it's different
            if temp_upload_path != fixed_wav_path:
                os.remove(fixed_wav_path)

        except FileNotFoundError:
            pass # If not exits, pass