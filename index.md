<br/>

### stopwatch的使用

```java
// 创建stopwatch并开始计时
Stopwatch stopwatch = Stopwatch.createStarted();
Thread.sleep(1980);
 // 以秒打印从计时开始至现在的所用时间，向下取整
System.out.println(stopwatch.elapsed(TimeUnit.SECONDS)); // 1

 // 停止计时
stopwatch.stop();
System.out.println(stopwatch.elapsed(TimeUnit.SECONDS)); // 1

// 再次计时
stopwatch.start();
Thread.sleep(100);
System.out.println(stopwatch.elapsed(TimeUnit.SECONDS)); // 2
// 重置并开始
stopwatch.reset().start();
Thread.sleep(1030);

```

### 各种排序处理

```java
// 按字段排序
List<DictionaryDto> dictList = dictResultMap.get(formField.getDicType())
dictList.stream().sorted(Comparator.comparing(DictionaryDto::getDictOrder))
// 倒序
dictList.stream().sorted(Comparator.comparing(DictionaryDto::getDictOrder).reversed())

List<String> exList = new ArrayList<>();
// 最简单的
exList .stream().sorted();
// 基本数据类型的倒序
exList.stream().sorted(Comparator.reverseOrder());

// 不使用stream
// 正序
list.sort(Comparator.comparing(Integer::intValue));
 // 倒序
list.sort(Comparator.comparing(Integer::intValue).reversed());
 // 正序
list.sort(Comparator.comparing(Student::getAge));
  // 倒序
list.sort(Comparator.comparing(Student::getAge).reversed());
```

### 获取package所有类/解析mapper的泛型

```java
	/**
	 * 解析mapper包路径下的所有类，返回mapper的entity名称和对应的mapper的class类
	 *
	 * @author libing
	 * @date 2022/1/24 10:39
	 */
	private static Map<String, Class<?>> parseGetEntityMapperMap(String mapperPackagePath) {
		Map<String, Class<?>> mapperMap = new HashMap<>();
		for (Class<?> cls : parseGetTargetClasses(mapperPackagePath)) {
			ResolvableType resolvableType = ResolvableType.forClass(cls);
			// 获取mapper中的泛型，也就是entity
			Class<?> entityCls = resolvableType.as(BaseMapper.class).getGeneric(0).resolve();
			if (null != entityCls) {
				// 继承BaseMapper的接口
				Class<?> mapperClass = resolvableType.getRawClass();
				mapperMap.put(entityCls.getSimpleName(), mapperClass);
			}
		}
		return mapperMap;
	}

	/**
	 * 获取包路径下的所有类
	 *
	 * @author libing
	 * @date 2022/1/24 10:15
	 */
	public static List<Class<?>> parseGetTargetClasses(String targetPackagePath) {
		List<Class<?>> classList = new ArrayList<>();
		try {
			ResourcePatternResolver resourcePatternResolver = new PathMatchingResourcePatternResolver();
			String pattern = ResourcePatternResolver.CLASSPATH_ALL_URL_PREFIX + ClassUtils.convertClassNameToResourcePath(targetPackagePath) + "/**/*.class";
			// MetadataReader 的工厂类
			MetadataReaderFactory readerfactory = new CachingMetadataReaderFactory(resourcePatternResolver);
			for (Resource resource : resourcePatternResolver.getResources(pattern)) {
				//用于读取类信息
				MetadataReader reader = readerfactory.getMetadataReader(resource);
				//扫描到的class
				String classname = reader.getClassMetadata().getClassName();
				Class<?> clazz = Class.forName(classname);
				classList.add(clazz);
			}
		} catch (Exception e) {
			log.error(e.getMessage(), e);
		}
		return classList;
	}
```

<br/>

### 解析获取一个对象的所有Field （包含子对象）

```java
    /**
     * 解析获取一个对象的所有Field （包含子对象）
     * @author libing
     * @date 2021/12/7 20:12
     */
    public static List<Field> parseFields(Object targetObject){
        List<Field> fields = Lists.newArrayList();

        Class<?> targetCls = targetObject.getClass();
        Arrays.stream(ClassUtil.getDeclaredFields(targetCls)).forEach(field -> {
            Class<?> itemCls = field.getType();
            if (Map.class.isAssignableFrom(itemCls)) {
                return; // map直接跳过
            }
            Object fieldValue = ReflectUtil.getFieldValue(targetObject, field);
            if (null != fieldValue) {
                // 集合类型，如果泛型的类型是JavaBean，继续递归处理
                if (Collection.class.isAssignableFrom(itemCls)) {
                    // 如果是list-map结果，则这里返回null
                    Class generic = ClassUtils.getGeneric(targetCls, field.getName());
                    if (null != generic && isBeanType(generic)) {
                        // 循环递归处理
                        ((Collection) fieldValue).forEach(item -> fields.addAll(parseFields(item)));
                    }
                } else {
                    if (isBeanType(itemCls)) {
                        fields.addAll(parseFields(fieldValue));
                    } else {
                        fields.add(field);
                    }
                }
            }
        });
        return fields;
    }


    /**
     * 判断是bean类型 （我们创建的相关dto等对象）
     *
     * @author libing
     * @date 2021/12/7 18:03
     */
    public static boolean isBeanType(Class<?> itemCls) {
        return itemCls.getPackage().getName().contains("cn.seehoo.seefa");
    }

```

### 生成还款计划表的更新语句

```java
CalcRateParam param = new CalcRateParam();
		param.setCustFinanceAmount(150000);
		param.setCustInterestRate(BigDecimal.valueOf(6.49));
		param.setFinancePeriod(36);
		Map<Integer, CalcRepaymentPlan> fullRepayPlanMap = pmtCalcRepayPlan(param).getRepaymentPlanList().stream()
				.collect(Collectors.toMap(CalcRepaymentPlan::getPeriod, item -> item));

		param.setCustFinanceAmount(1500);
		List<CalcRepaymentPlan> targetList = new ArrayList<>();
		pmtCalcRepayPlan(param).getRepaymentPlanList().forEach(item ->{
			CalcRepaymentPlan remainedDto = BeanMapper.map(item, CalcRepaymentPlan.class);
			CalcRepaymentPlan repayPlan = fullRepayPlanMap.get(item.getPeriod());
			remainedDto.setBeginningPrincipal(repayPlan.getBeginningPrincipal().subtract(item.getBeginningPrincipal()));
			remainedDto.setMonthlyAmount(repayPlan.getMonthlyAmount().subtract(item.getMonthlyAmount()));
			remainedDto.setPaidInterestAmount(repayPlan.getPaidInterestAmount().subtract(item.getPaidInterestAmount()));
			remainedDto.setPrincipalRepaymentAmount(repayPlan.getPrincipalRepaymentAmount().subtract(item.getPrincipalRepaymentAmount()));
			targetList.add(remainedDto);
		});

		String sql = "update t_order_repayment_plan set monthly_amount={},principal_repayment_amount={},paid_interest_amount={},beginning_principal={} " +
				"where order_no='9411961223' and period={} and type={};";
		targetList.stream().filter(item -> item.getPeriod() != 0).forEach(item -> {
			System.out.println(StrUtil.format(sql, item.getMonthlyAmount(), item.getPrincipalRepaymentAmount(),
					item.getPaidInterestAmount(), item.getBeginningPrincipal(), item.getPeriod(), "2"));
		});
```

<br/>

### 根据httpUrl获取完整文件名

```java
    /**
     * 根据httpUrl获取完整文件名
     * <pre>
     *     比如：http://lcoalhsod:8080/asd/asdga/dsd/abc.jpg?a=asd&b=121
     *     转换后： abc.jpg
     * </pre>
     *
     * @author libing
     * @date 2021/11/25 10:46
     */
    public static String getFileName(String httpUrl) {
        if (StrUtil.isEmpty(httpUrl)) {
            return StrUtil.EMPTY;
        }
        httpUrl = httpUrl.split("\\?")[0];
        if (httpUrl.contains("/")) {
            return httpUrl.substring(httpUrl.lastIndexOf("/") + 1);
        }
        return httpUrl;
    }
```

### 单例模式使用

```java
// volatile变量，用来确保将变量的更新操作通知到其他线程。
    // 在访问volatile变量时不会执行加锁操作，因此也就不会使执行线程阻塞，因此volatile变量是一种比sychronized关键字更轻量级的同步机制
    private static volatile DynamicFieldSupport instance = null;

    /** 单例处理，不能创建对象 */
    private DynamicFieldSupport() {
    }
    public static DynamicFieldSupport build(String modifyFieldJson) {
        if (instance == null) {
            // synchronized起到多线程下原子性、有序性、可见性的作用
            synchronized (DynamicFieldSupport.class) {
                if (instance == null) {
                    instance = new DynamicFieldSupport();
                }
            }
        }
        return instance;
    }
```

<br/>

### 修改注解的值/查找package下的所有类

```java
    /** 系统启动，初始化处理MyBatis相关内容 */
    @PostConstruct
    public void initHandleMybatis() {
        String entityPackagePath= "cn.seehoo.seefa.zebra.model";
        parseEntityAnnotationSetNewValue(entityPackagePath);
    }

    /**
     * 解析entity的注解，根据条件重置schema的值
     *
     * @param targetPackagePath : 含有TableName注解的类的包路径
     * @author libing
     * @date 2021/12/29 16:37
     */
    private void parseEntityAnnotationSetNewValue(String targetPackagePath) {
        try {
            ResourcePatternResolver resourcePatternResolver = new PathMatchingResourcePatternResolver();
            String pattern = ResourcePatternResolver.CLASSPATH_ALL_URL_PREFIX + ClassUtils.convertClassNameToResourcePath(targetPackagePath) + "/**/*.class";
            // MetadataReader 的工厂类
            MetadataReaderFactory readerfactory = new CachingMetadataReaderFactory(resourcePatternResolver);
            for (Resource resource : resourcePatternResolver.getResources(pattern)) {
                //用于读取类信息
                MetadataReader reader = readerfactory.getMetadataReader(resource);
                //扫描到的class
                String classname = reader.getClassMetadata().getClassName();
                Class<?> clazz = Class.forName(classname);

                /*判断是否有注解TableName，且schema属性值*/
                TableName annoTableName = clazz.getAnnotation(TableName.class);
                if (!Objects.isNull(annoTableName) && StrUtil.isNotEmpty(annoTableName.schema())) {
                    // 有schema，则添加数据库前缀
                    AnnotationUtil.setValue(annoTableName, "schema", zebraNacosProperties.getDbPrefix() + annoTableName.schema());
                }
            }
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }
    }
```

<br/>

### 创建fdfs防盗链链接

```java
    public static void main(String[] args) {
        String fullPath = "group1/M00/00/0/rBQCC2E4TI6AMCFjAADCIn60HdY443.JPG";
        int ts = (int) Instant.now().getEpochSecond();
        // 这里的filepath不包含group
        String filepath = fullPath.substring(fullPath.indexOf("/") + 1);
        String token = FastdfsUtil.getToken(filepath, "volvo1234567890", ts);
        String fileUrl = "https://financialleasing.volvocars.com.cn/" + fullPath;
        String url = fileUrl + "?token=" + token + "&ts=" + ts;
        System.out.println(url);
    }
```

### http下载附件并上传

```java
httpUploadAttachment("group1/M00/01/19/rB45RWFFOsCAfjPcAAEBacj3x0I836.pdf", "http://39.105.138.1");

/**
     * http下载附件
     *
     * @param fileId :  附件id
     * @param domain : 域名地址 比如:http://39.105.138.1
     * @return java.lang.String 新的附件地址
     * @author libing
     * @date 2021/9/22 18:06
     */
    private static String httpUploadAttachment(String fileId, String domain) {
        /*获取fileId的完整路径*/
        String getFileUrl = domain + "/gateway/whale/attachment/getFileUrlInfo?fileId=" + fileId;
        HttpResponse httpResponse = HttpUtil.createGet(getFileUrl).execute();
        JSONObject jsonObject = JSONObject.parseObject(httpResponse.body());
        String downLoadUrl = jsonObject.getJSONObject("data").getString("downLoadUrl");

        // 获取token
        String tokenUrl = domain + "/gateway/whale/attachment/getToken";
        String json = "{\"busiId\":\"123456789\",\"creatorId\":\"liam\",\"creatorName\":\"liam\"}";
        HttpResponse response = HttpUtil.createPost(tokenUrl).body(json).execute();
        jsonObject = JSONObject.parseObject(response.body());
        String token = jsonObject.getJSONObject("data").getString("token");

        /*附件上传*/
        String uploadUrl = domain + "/gateway/whale/attachment/uploadByteArrayFile";
        JSONObject uploadParam = new JSONObject();
        uploadParam.put("token", token);
        uploadParam.put("fileName", FileNameUtil.getName(fileId));
        uploadParam.put("fileContent", HttpUtil.downloadBytes(downLoadUrl));
        System.out.println(uploadParam);
        response = HttpUtil.createPost(uploadUrl).body(uploadParam.toJSONString()).execute();
        System.out.println(response);
        return jsonObject.getJSONObject("data").getString("downLoadUrl");
    }
```

### JS脚本测试

```java
public static void main(String[] args) {
    SimpleBindings simpleBindings = new SimpleBindings();
    JSONObject fulldata = JSONObject.parseObject("{\"contractInfo\":{\"contractNo\":\"volvo-2021-10-00065\",\"contractSignPlace\":\"天津市\",\"createTime\":\"2021-10-2610:19:25\",\"orderNo\":\"4399419995\"},\"enterpriseAuthInfo\":{\"authIdNo\":\"110101199503071053\",\"authName\":\"李四\",\"authPhone\":\"13700002222\",\"legalIdNo\":\"510502199604040064\",\"legalName\":\"张三\",\"legalPhone\":\"13700001111\"},\"insurancePolicyList\":[],\"oderAscription\":{\"dealerCity\":\"110100\",\"dealerCode\":\"D900000014\",\"dealerName\":\"奔驰服务有限公司\",\"dealerProvince\":\"110000\",\"dealerSource\":\"1\",\"orderBelonger\":\"xzw\",\"orderBelongerName\":\"夏紫文\",\"orderNo\":\"4399419995\",\"salePhone\":\"13623859715\"},\"orderCarInfo\":{\"brandId\":\"122\",\"brandModel\":\"红旗\",\"brandName\":\"沃尔沃\",\"carClassify\":\"8\",\"carColorName\":\"灰色\",\"carGuidancePrice\":264900.0,\"carType\":\"1\",\"dependOn\":\"0\",\"displacement\":1.5,\"energyType\":\"0\",\"engineNum\":\"49494949\",\"licenseNum\":\"\",\"modelYear\":\"2022\",\"orderNo\":\"4399419995\",\"seriesGroupId\":\"180\",\"seriesGroupName\":\"沃尔沃亚太\",\"seriesId\":\"10003\",\"seriesName\":\"沃尔沃XC40\",\"styleId\":\"100034\",\"styleName\":\"XC40T3智行时尚版\",\"styleVersion\":2,\"transferFlag\":\"0\",\"vinNum\":\"3MK61CS43K386N5CH\"},\"orderDatetimeInfo\":{\"firstSubmitTime\":\"2021-10-2610:04:12\",\"orderNo\":\"4399419995\",\"signContractDate\":\"2021-10-2600:00:00\",\"submitTime\":\"2021-10-2610:04:12\"},\"orderEnterpriseInfo\":{\"businessScope\":\"一般经营项目是：汽车租赁；已授权的品牌汽车销售；二手车销售；饰品、汽车零配件的销售；国内贸易，从事货物及技术的进出口业务（法律、行政法规、国务院决定禁止的项目除外，限制的项目须取得许可后方可经营），许可经营项目是：\",\"certExpirationDate\":\"5000-01-01\",\"companyMobile\":\"13623859715\",\"companyScale\":\"1\",\"economicType\":\"1\",\"enterpriseName\":\"深圳市京广铭车汽车销售服务有限公司\",\"establishmentDate\":\"2015-06-25\",\"haveNonFinancial\":\"1\",\"haveRelatedParty\":\"0\",\"isGroupCustomer\":\"0\",\"legalPersonCertNo\":\"410223199805229877\",\"legalPersonName\":\"夏紫文\",\"legalPersonPhone\":\"13623859715\",\"legalPersonStake\":\"60\",\"nationEconomicIndustry\":\"1\",\"orderNo\":\"4399419995\",\"organizationType\":\"1\",\"premisesAddress\":\"悄无声息\",\"premisesCity\":\"340800\",\"premisesDistrict\":\"340803\",\"premisesProvince\":\"340000\",\"registeredCapital\":6000.0,\"registeredCurrency\":\"RMB\",\"registrationAddress\":\"深圳市罗湖区笋岗街道笋岗东路2008号嘉宝田花园西侧远望二手车交易市场A区A5-A6\",\"registrationCity\":\"440300\",\"registrationCityName\":\"深圳市\",\"registrationDistrict\":\"440303\",\"registrationDistrictName\":\"罗湖区\",\"registrationProvince\":\"440000\",\"registrationProvinceName\":\"广东省\",\"unifiedSocialCreditCode\":\"914403003429476404\"},\"orderFinanceInfo\":{\"actualSellingPrice\":646464.0,\"custFinanceAmount\":292585.6,\"custInterestRate\":4.17,\"dealerDeductDiscountLoanFlag\":\"1\",\"dealerDiscountAmount\":3500.0,\"dealerDiscountMode\":\"1\",\"dealerDiscountRate\":2.17,\"discountFlag\":\"1\",\"downPaymentAmount\":387878.4,\"downPaymentProportion\":60.0,\"loanAmount\":291085.6,\"manufacturerDeductDiscountLoanFlag\":\"1\",\"manufacturerDiscountAmount\":2500.0,\"manufacturerDiscountMode\":\"1\",\"manufacturerDiscountRate\":1.54,\"monthlyAmount\":24935.33,\"orderNo\":\"4399419995\",\"settlementInterestRate\":7.88,\"term\":\"12\",\"totalDiscountAmount\":6000.0,\"totalRent\":299223.96},\"orderFinanceItemList\":[{\"financeAmount\":15000.0,\"financeCode\":\"F002\",\"financeName\":\"购置税融资额\",\"isLoan\":\"1\",\"orderNo\":\"4399419995\"},{\"financeAmount\":1000.0,\"financeCode\":\"F003\",\"financeName\":\"GPS基础价融资额\",\"isLoan\":\"1\",\"orderNo\":\"4399419995\"},{\"financeAmount\":1500.0,\"financeCode\":\"F004\",\"financeName\":\"GPS加权益包融资额\",\"isLoan\":\"1\",\"orderNo\":\"4399419995\"},{\"financeAmount\":15000.0,\"financeCode\":\"F005\",\"financeName\":\"商业险融资额\",\"isLoan\":\"1\",\"orderNo\":\"4399419995\"},{\"financeAmount\":1500.0,\"financeCode\":\"F009\",\"financeName\":\"交强险融资额\",\"isLoan\":\"0\",\"orderNo\":\"4399419995\"},{\"financeAmount\":258585.6,\"financeCode\":\"F001\",\"financeName\":\"车款融资额\",\"isLoan\":\"1\",\"orderNo\":\"4399419995\"}],\"orderInfo\":{\"businessType\":\"1\",\"chargeMode\":\"利率\",\"custType\":\"2\",\"leaseMode\":\"自营\",\"leaseType\":\"1\",\"monthlyRentMode\":\"等额本息\",\"orderNo\":\"4399419995\",\"orderStatus\":\"303000\",\"productCode\":\"P31010\",\"productName\":\"TEST融(可贴息)\",\"productVersion\":\"1\"},\"orderMarkInfo\":{\"orderNo\":\"4399419995\",\"policyFlag\":\"0\",\"registrationFlag\":\"0\"},\"orderPayeeInfo\":{\"accountType\":\"2\",\"branchName\":\"中国工商银行昆山张浦支行\",\"dealerPayCarId\":\"1449201581885394945\",\"orderNo\":\"4399419995\",\"payeeBankName\":\"中国工商银行\",\"payeeCity\":\"320500\",\"payeeElectronicNo\":\"102305223214\",\"payeeName\":\"思享驾收款1\",\"payeeProvence\":\"320000\",\"payeeUserAccount\":\"122353266\",\"payeeUserName\":\"思享驾收款1\",\"receivableType\":\"1,2,3,4,5,6\"},\"orderRelationshipInfoList\":[{\"orderNo\":\"4399419995\",\"relationship\":\"7\",\"relativeName\":\"小黑\",\"relativePhone\":\"13855556666\",\"relativeType\":\"2\"},{\"orderNo\":\"4399419995\",\"relationship\":\"7\",\"relativeName\":\"小白\",\"relativePhone\":\"13788885556\",\"relativeType\":\"2\"}],\"orderRepaymentPlanList\":[{\"beginningPrincipal\":292585.6,\"endDate\":\"2021-12-25\",\"monthlyAmount\":24935.33,\"orderNo\":\"4399419995\",\"paidInterestAmount\":1016.73,\"period\":\"1\",\"principalRepaymentAmount\":23918.6,\"startDate\":\"2021-11-25\"},{\"beginningPrincipal\":268667.0,\"endDate\":\"2022-01-25\",\"monthlyAmount\":24935.33,\"orderNo\":\"4399419995\",\"paidInterestAmount\":933.62,\"period\":\"2\",\"principalRepaymentAmount\":24001.71,\"startDate\":\"2021-12-25\"},{\"beginningPrincipal\":244665.29,\"endDate\":\"2022-02-25\",\"monthlyAmount\":24935.33,\"orderNo\":\"4399419995\",\"paidInterestAmount\":850.21,\"period\":\"3\",\"principalRepaymentAmount\":24085.12,\"startDate\":\"2022-01-25\"},{\"beginningPrincipal\":220580.17,\"endDate\":\"2022-03-25\",\"monthlyAmount\":24935.33,\"orderNo\":\"4399419995\",\"paidInterestAmount\":766.52,\"period\":\"4\",\"principalRepaymentAmount\":24168.81,\"startDate\":\"2022-02-25\"},{\"beginningPrincipal\":196411.36,\"endDate\":\"2022-04-25\",\"monthlyAmount\":24935.33,\"orderNo\":\"4399419995\",\"paidInterestAmount\":682.53,\"period\":\"5\",\"principalRepaymentAmount\":24252.8,\"startDate\":\"2022-03-25\"},{\"beginningPrincipal\":172158.56,\"endDate\":\"2022-05-25\",\"monthlyAmount\":24935.33,\"orderNo\":\"4399419995\",\"paidInterestAmount\":598.25,\"period\":\"6\",\"principalRepaymentAmount\":24337.08,\"startDate\":\"2022-04-25\"},{\"beginningPrincipal\":147821.48,\"endDate\":\"2022-06-25\",\"monthlyAmount\":24935.33,\"orderNo\":\"4399419995\",\"paidInterestAmount\":513.68,\"period\":\"7\",\"principalRepaymentAmount\":24421.65,\"startDate\":\"2022-05-25\"},{\"beginningPrincipal\":123399.83,\"endDate\":\"2022-07-25\",\"monthlyAmount\":24935.33,\"orderNo\":\"4399419995\",\"paidInterestAmount\":428.81,\"period\":\"8\",\"principalRepaymentAmount\":24506.52,\"startDate\":\"2022-06-25\"},{\"beginningPrincipal\":98893.31,\"endDate\":\"2022-08-25\",\"monthlyAmount\":24935.33,\"orderNo\":\"4399419995\",\"paidInterestAmount\":343.65,\"period\":\"9\",\"principalRepaymentAmount\":24591.68,\"startDate\":\"2022-07-25\"},{\"beginningPrincipal\":74301.63,\"endDate\":\"2022-09-25\",\"monthlyAmount\":24935.33,\"orderNo\":\"4399419995\",\"paidInterestAmount\":258.2,\"period\":\"10\",\"principalRepaymentAmount\":24677.13,\"startDate\":\"2022-08-25\"},{\"beginningPrincipal\":49624.5,\"endDate\":\"2022-10-25\",\"monthlyAmount\":24935.33,\"orderNo\":\"4399419995\",\"paidInterestAmount\":172.45,\"period\":\"11\",\"principalRepaymentAmount\":24762.88,\"startDate\":\"2022-09-25\"},{\"beginningPrincipal\":24861.62,\"endDate\":\"2022-11-25\",\"monthlyAmount\":24935.33,\"orderNo\":\"4399419995\",\"paidInterestAmount\":73.71,\"period\":\"12\",\"principalRepaymentAmount\":24861.62,\"startDate\":\"2022-10-25\"}],\"repaymentInfo\":{\"orderNo\":\"4399419995\",\"repaymentMethod\":\"1\"}}");
    simpleBindings.put(JudgeConstant.JUDGE_PARAM_FULL_DATA, fulldata);
    String judge = "fn.irr(fn.get(data.orderFinanceInfo, \"custFinanceAmount\"),data.orderRepaymentPlanList,\"monthlyAmount\", function(arr){arr.push(fn.numFormat(fn.get(data.orderFinanceInfo,\"retentionPrice\"))||100.0)})";
    // 自定义绑定对象
    Object eval = JsEngineUtil.eval(judge, simpleBindings);
    System.out.println(eval);
}
```

### 校验字段的有效性

```java

    /**
     * 校验字段的有效性
     *
     * @param beanObject : 校验对象
     * @param groupEnum  : 校验对象的分组
     * @return 非空，说明校验不通过
     * @author libing
     * @date 2021/11/26 15:28
     */
    private List<String> checkFieldsValidity(Object beanObject, ChangeGroupEnum groupEnum) {
        List<String> errMsgList = Lists.newArrayList();
        if (null == beanObject) {
            return errMsgList;
        }
        /*赋值，然后字典翻译，判断翻译内容*/
        DictTranslateDto dictTranslateDto = BeanMapper.map(beanObject, DictTranslateDto.class);
        dictSupport.translateBeanDictCode(dictTranslateDto);
        // 遍历处理所有字段，校验提示所有翻译不正确的字段
        Arrays.stream(ClassUtil.getDeclaredFields(dictTranslateDto.getClass()))
                // 含有Dict注解 且 值为空的字段
                .filter(field -> AnnotationUtil.hasAnnotation(field, Dict.class) && ObjectUtil.isNull(ReflectUtil.getFieldValue(dictTranslateDto, field)))
                .forEach(field -> {
                    Dict dict = AnnotationUtil.getAnnotation(field, Dict.class);
                    // 字典code的名称，默认是去除尾缀Name的字段
                    String codeFieldName = dict.codeName();
                    if (StrUtil.isEmpty(codeFieldName)) {
                        codeFieldName = field.getName().substring(0, field.getName().lastIndexOf("Name"));
                    }
                    // 如果字典code不为空，当前field（字典翻译字段）为空，说明没有翻译出来，有问题
                    if (ObjectUtil.isNotNull(ReflectUtil.getFieldValue(dictTranslateDto, codeFieldName))) {
                        ChangeGroupFieldEnum fieldEnum = ChangeGroupFieldEnum.findFieldEnum(groupEnum.getGroupName(), codeFieldName);
                        errMsgList.add(StrUtil.format("{}字典码无效", null == fieldEnum ? codeFieldName : fieldEnum.getFieldZhName()));
                    }
                });
        return errMsgList;
    }
```

### form表单上传文件

```java
String url = "http://localhost:8081/attachment/getToken";
Map<String, Object> paramMap = MapUtil.of(Pair.of("busiId", "12321"),
        Pair.of("creatorId", "liam"), Pair.of("creatorName", "栗兵"));
HttpResponse execute = HttpUtil.createPost(url).body(CommonUtil.toJson(paramMap)).execute();
System.out.println(execute.body());
JSONObject jsonObject = JSONObject.parseObject(execute.body());
String token = jsonObject.getJSONObject("data").getString("token");

String fileUrl = "https://financialleasinguat.volvocars.com.cn/group1/M00/01/0C/rBQEMWHOpGWAXiukAADPFfFvZv8605.pdf?token=02e5faed25520c936bacdeb276cce108&ts=1645580061";
// 下载文件为二进制格式
Resource bytesResource = new BytesResource(HttpUtil.downloadBytes(fileUrl), ServiceUtils.getFileName(fileUrl));
// 文件上传只需将参数中的键指定（默认file），值设为文件对象即可，对于使用者来说，文件上传与普通表单提交并无区别
String result = HttpUtil.post("http://localhost:8081/attachment/uploadMultipartFile",
        ImmutableMap.of("file", bytesResource, "token", token));
log.info("上传结果：{}", result);
```
