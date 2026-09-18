# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/crm/contact-list.spec.ts >> CRM - Contact List >> TC:10 Verify linked Customer navigation
- Location: tests/crm/contact-list.spec.ts:216:7

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: locator.click: Test timeout of 60000ms exceeded.
Call log:
  - waiting for getByRole('link', { name: 'Existing Linked Customer' })

```

# Page snapshot

```yaml
- generic [ref=f2e2]:
  - generic [ref=f2e3]:
    - banner [ref=f2e5]:
      - generic [ref=f2e6]:
        - generic [ref=f2e7]:
          - button "Open navigation" [ref=f2e8] [cursor=pointer]
          - button "Open app drawer" [ref=f2e12] [cursor=pointer]
          - button "Go to App Launcher" [ref=f2e18] [cursor=pointer]:
            - generic [ref=f2e47]: FloorOS
          - generic [ref=f2e49]: CRM
        - button "Open search" [ref=f2e58] [cursor=pointer]:
          - generic [ref=f2e63]: Search apps, people, actions…
          - generic [ref=f2e64]: K
        - generic [ref=f2e67]:
          - button "Change language" [ref=f2e69] [cursor=pointer]
          - button "Switch to dark theme" [ref=f2e73] [cursor=pointer]
          - button "Notifications, 277 unread" [ref=f2e77] [cursor=pointer]:
            - generic [ref=f2e81]: 9+
          - button "Open user menu" [ref=f2e83] [cursor=pointer]:
            - generic [ref=f2e84]: AP
            - generic [ref=f2e85]:
              - generic [ref=f2e86]: Alice Planner
              - generic [ref=f2e87]: Admin
    - main [ref=f2e88]:
      - generic [ref=f2e91]:
        - region "Notifications alt+T"
        - main [ref=f2e93]:
          - generic [ref=f2e96]:
            - heading "Contacts" [level=1] [ref=f2e100]
            - generic [ref=f2e101]:
              - generic [ref=f2e104]:
                - button "All 127" [pressed] [ref=f2e105] [cursor=pointer]:
                  - generic [ref=f2e106]: All
                  - generic [ref=f2e107]: "127"
                - button "Linked 109" [ref=f2e108] [cursor=pointer]:
                  - generic [ref=f2e109]: Linked
                  - generic [ref=f2e110]: "109"
                - button "Unlinked 18" [ref=f2e111] [cursor=pointer]:
                  - generic [ref=f2e112]: Unlinked
                  - generic [ref=f2e113]: "18"
              - generic [ref=f2e114]:
                - textbox "Search" [ref=f2e116]
                - button "Filters" [ref=f2e117] [cursor=pointer]
                - generic [ref=f2e120]:
                  - button "Refresh" [ref=f2e122] [cursor=pointer]
                  - button "Toggle cell filters" [ref=f2e124] [cursor=pointer]
                  - button "Configure columns" [ref=f2e126] [cursor=pointer]
                  - button "Best-fit columns" [ref=f2e128] [cursor=pointer]
                  - generic [ref=f2e130]:
                    - button "No split" [pressed] [ref=f2e131] [cursor=pointer]
                    - button "Vertical split" [ref=f2e134] [cursor=pointer]
                    - button "Horizontal split" [ref=f2e137] [cursor=pointer]
                - generic [ref=f2e140]:
                  - button "Create Contact" [ref=f2e141] [cursor=pointer]
                  - button "More actions" [ref=f2e142] [cursor=pointer]
            - table [ref=f2e146]:
              - rowgroup [ref=f2e147]:
                - row [ref=f2e148]:
                  - columnheader [ref=f2e149]:
                    - checkbox "Select all rows" [ref=f2e150] [cursor=pointer]
                  - columnheader [ref=f2e151]:
                    - button "Contact Name" [ref=f2e152] [cursor=pointer]
                    - button "Resize Contact Name column" [ref=f2e157]
                  - columnheader [ref=f2e158]:
                    - button "Customer Name" [ref=f2e159] [cursor=pointer]
                    - button "Resize Customer Name column" [ref=f2e164]
                  - columnheader [ref=f2e165]:
                    - button "Email" [ref=f2e166] [cursor=pointer]
                    - button "Resize Email column" [ref=f2e171]
                  - columnheader "Phone Resize Phone column" [ref=f2e172]:
                    - generic [ref=f2e173]: Phone
                    - button "Resize Phone column" [ref=f2e174]
                  - columnheader [ref=f2e175]:
                    - button "Location" [ref=f2e176] [cursor=pointer]
                    - button "Resize Location column" [ref=f2e181]
                  - columnheader [ref=f2e182]:
                    - button "Status" [ref=f2e183] [cursor=pointer]
                    - button "Resize Status column" [ref=f2e188]
              - rowgroup [ref=f2e189]:
                - row [ref=f2e190] [cursor=pointer]:
                  - cell [ref=f2e191]:
                    - checkbox "Select row 6c24e66f-6263-4b3e-afec-f3532a745dcc" [ref=f2e192]
                  - cell "Playwright Test Contact Buyer" [ref=f2e193]:
                    - generic [ref=f2e195]:
                      - generic [ref=f2e196]: Playwright Test Contact
                      - generic [ref=f2e197]: Buyer
                  - cell [ref=f2e198]:
                    - button "Acme Textiles" [ref=f2e199]
                  - cell "pw-contact-1789574031296@example.com" [ref=f2e200]
                  - cell "—" [ref=f2e201]
                  - cell "Coimbatore, India" [ref=f2e202]
                  - cell "Active" [ref=f2e203]
                - row [ref=f2e206] [cursor=pointer]:
                  - cell [ref=f2e207]:
                    - checkbox "Select row 941661a3-e519-4bbd-8b37-f69976b893b8" [ref=f2e208]
                  - cell "Playwright Unlinked Contact Buyer" [ref=f2e209]:
                    - generic [ref=f2e211]:
                      - generic [ref=f2e212]: Playwright Unlinked Contact
                      - generic [ref=f2e213]: Buyer
                  - cell [ref=f2e214]:
                    - button "Playwright Test Customer 1789566877789" [ref=f2e215]
                  - cell "pw-unlinked-1789566861169@example.com" [ref=f2e216]
                  - cell "—" [ref=f2e217]
                  - cell "Coimbatore, India" [ref=f2e218]
                  - cell "Active" [ref=f2e219]
                - row [ref=f2e222] [cursor=pointer]:
                  - cell [ref=f2e223]:
                    - checkbox "Select row d91558cd-a20b-4ed9-afe8-9b58494cd304" [ref=f2e224]
                  - cell "Playwright Handoff Contact Buyer" [ref=f2e225]:
                    - generic [ref=f2e227]:
                      - generic [ref=f2e228]: Playwright Handoff Contact
                      - generic [ref=f2e229]: Buyer
                  - cell [ref=f2e230]:
                    - button "Create a customer for this contact" [ref=f2e231]: Unlinked
                  - cell "pw-handoff-1789566784633@example.com" [ref=f2e232]
                  - cell "—" [ref=f2e233]
                  - cell "Coimbatore, India" [ref=f2e234]
                  - cell "Active" [ref=f2e235]
                - row [ref=f2e238] [cursor=pointer]:
                  - cell [ref=f2e239]:
                    - checkbox "Select row 5d131381-1459-4d75-9a5e-4cfbbfe3a329" [ref=f2e240]
                  - cell "Playwright Unlinked Contact Buyer" [ref=f2e241]:
                    - generic [ref=f2e243]:
                      - generic [ref=f2e244]: Playwright Unlinked Contact
                      - generic [ref=f2e245]: Buyer
                  - cell [ref=f2e246]:
                    - button "Playwright Test Customer 1789566799042" [ref=f2e247]
                  - cell "pw-unlinked-1789566783150@example.com" [ref=f2e248]
                  - cell "—" [ref=f2e249]
                  - cell "Coimbatore, India" [ref=f2e250]
                  - cell "Active" [ref=f2e251]
                - row [ref=f2e254] [cursor=pointer]:
                  - cell [ref=f2e255]:
                    - checkbox "Select row 1a04fd41-818e-4ba5-80cb-11d6abc308ca" [ref=f2e256]
                  - cell "Playwright Test Contact Buyer" [ref=f2e257]:
                    - generic [ref=f2e259]:
                      - generic [ref=f2e260]: Playwright Test Contact
                      - generic [ref=f2e261]: Buyer
                  - cell [ref=f2e262]:
                    - button "Playwright Handoff Customer 1789566707444" [ref=f2e263]
                  - cell "pw-contact-1789566742015@example.com" [ref=f2e264]
                  - cell "—" [ref=f2e265]
                  - cell "Coimbatore, India" [ref=f2e266]
                  - cell "Active" [ref=f2e267]
                - row [ref=f2e270] [cursor=pointer]:
                  - cell [ref=f2e271]:
                    - checkbox "Select row 0fe469c2-9d38-4a43-ac7c-c907e2c7cc49" [ref=f2e272]
                  - cell "Playwright Test Contact Buyer" [ref=f2e273]:
                    - generic [ref=f2e275]:
                      - generic [ref=f2e276]: Playwright Test Contact
                      - generic [ref=f2e277]: Buyer
                  - cell [ref=f2e278]:
                    - button "Create a customer for this contact" [ref=f2e279]: Unlinked
                  - cell "pw-duplicate-1789566708675@example.com" [ref=f2e280]
                  - cell "—" [ref=f2e281]
                  - cell "Coimbatore, India" [ref=f2e282]
                  - cell "Active" [ref=f2e283]
                - row [ref=f2e286] [cursor=pointer]:
                  - cell [ref=f2e287]:
                    - checkbox "Select row f926e875-591a-44c4-9c64-97b595bd360e" [ref=f2e288]
                  - cell "Playwright Test Contact Buyer" [ref=f2e289]:
                    - generic [ref=f2e291]:
                      - generic [ref=f2e292]: Playwright Test Contact
                      - generic [ref=f2e293]: Buyer
                  - cell [ref=f2e294]:
                    - button "Create a customer for this contact" [ref=f2e295]: Unlinked
                  - cell "pw-contact-1789566728053@example.com" [ref=f2e296]
                  - cell "—" [ref=f2e297]
                  - cell "Coimbatore, India" [ref=f2e298]
                  - cell "Active" [ref=f2e299]
                - row [ref=f2e302] [cursor=pointer]:
                  - cell [ref=f2e303]:
                    - checkbox "Select row 95a6b829-772f-4e7f-a913-451f4ba95c22" [ref=f2e304]
                  - cell "Playwright Test Contact Buyer" [ref=f2e305]:
                    - generic [ref=f2e307]:
                      - generic [ref=f2e308]: Playwright Test Contact
                      - generic [ref=f2e309]: Buyer
                  - cell [ref=f2e310]:
                    - button "Acme Textiles" [ref=f2e311]
                  - cell "pw-contact-1789566723420@example.com" [ref=f2e312]
                  - cell "—" [ref=f2e313]
                  - cell "Coimbatore, India" [ref=f2e314]
                  - cell "Active" [ref=f2e315]
                - row [ref=f2e318] [cursor=pointer]:
                  - cell [ref=f2e319]:
                    - checkbox "Select row edc36a38-cc4d-4786-b81c-8db8291d23db" [ref=f2e320]
                  - cell "Playwright Test Contact Buyer" [ref=f2e321]:
                    - generic [ref=f2e323]:
                      - generic [ref=f2e324]: Playwright Test Contact
                      - generic [ref=f2e325]: Buyer
                  - cell [ref=f2e326]:
                    - button "Acme Textiles" [ref=f2e327]
                  - cell "pw-contact-1789566702514@example.com" [ref=f2e328]
                  - cell "—" [ref=f2e329]
                  - cell "Coimbatore, India" [ref=f2e330]
                  - cell "Active" [ref=f2e331]
                - row [ref=f2e334] [cursor=pointer]:
                  - cell [ref=f2e335]:
                    - checkbox "Select row 930ad303-554b-4a65-8ea3-17b242c9efb9" [ref=f2e336]
                  - cell "Playwright Unlinked Contact Buyer" [ref=f2e337]:
                    - generic [ref=f2e339]:
                      - generic [ref=f2e340]: Playwright Unlinked Contact
                      - generic [ref=f2e341]: Buyer
                  - cell [ref=f2e342]:
                    - button "Playwright Test Customer 1789566523302" [ref=f2e343]
                  - cell "pw-unlinked-1789566506047@example.com" [ref=f2e344]
                  - cell "—" [ref=f2e345]
                  - cell "Coimbatore, India" [ref=f2e346]
                  - cell "Active" [ref=f2e347]
                - row [ref=f2e350] [cursor=pointer]:
                  - cell [ref=f2e351]:
                    - checkbox "Select row 23b295c0-38e4-48cd-a6cd-b5ca9a46b474" [ref=f2e352]
                  - cell "Playwright Handoff Contact Buyer" [ref=f2e353]:
                    - generic [ref=f2e355]:
                      - generic [ref=f2e356]: Playwright Handoff Contact
                      - generic [ref=f2e357]: Buyer
                  - cell [ref=f2e358]:
                    - button "Create a customer for this contact" [ref=f2e359]: Unlinked
                  - cell "pw-handoff-1789566439581@example.com" [ref=f2e360]
                  - cell "—" [ref=f2e361]
                  - cell "Coimbatore, India" [ref=f2e362]
                  - cell "Active" [ref=f2e363]
                - row [ref=f2e366] [cursor=pointer]:
                  - cell [ref=f2e367]:
                    - checkbox "Select row 21b16ec2-9eb3-4d77-a00a-480e056d13fd" [ref=f2e368]
                  - cell "Playwright Unlinked Contact Buyer" [ref=f2e369]:
                    - generic [ref=f2e371]:
                      - generic [ref=f2e372]: Playwright Unlinked Contact
                      - generic [ref=f2e373]: Buyer
                  - cell [ref=f2e374]:
                    - button "Playwright Test Customer 1789566448102" [ref=f2e375]
                  - cell "pw-unlinked-1789566432245@example.com" [ref=f2e376]
                  - cell "—" [ref=f2e377]
                  - cell "Coimbatore, India" [ref=f2e378]
                  - cell "Active" [ref=f2e379]
                - row [ref=f2e382] [cursor=pointer]:
                  - cell [ref=f2e383]:
                    - checkbox "Select row cb3fa919-a4e4-45fe-b8c2-f5e8ae484e55" [ref=f2e384]
                  - cell "Playwright Test Contact Buyer" [ref=f2e385]:
                    - generic [ref=f2e387]:
                      - generic [ref=f2e388]: Playwright Test Contact
                      - generic [ref=f2e389]: Buyer
                  - cell [ref=f2e390]:
                    - button "Create a customer for this contact" [ref=f2e391]: Unlinked
                  - cell "pw-duplicate-1789566359408@example.com" [ref=f2e392]
                  - cell "—" [ref=f2e393]
                  - cell "Coimbatore, India" [ref=f2e394]
                  - cell "Active" [ref=f2e395]
                - row [ref=f2e398] [cursor=pointer]:
                  - cell [ref=f2e399]:
                    - checkbox "Select row 6eddf9d0-b9e4-40de-9b05-d94f92d89949" [ref=f2e400]
                  - cell "Playwright Test Contact Buyer" [ref=f2e401]:
                    - generic [ref=f2e403]:
                      - generic [ref=f2e404]: Playwright Test Contact
                      - generic [ref=f2e405]: Buyer
                  - cell [ref=f2e406]:
                    - button "Playwright Handoff Customer 1789566343986" [ref=f2e407]
                  - cell "pw-contact-1789566383455@example.com" [ref=f2e408]
                  - cell "—" [ref=f2e409]
                  - cell "Coimbatore, India" [ref=f2e410]
                  - cell "Active" [ref=f2e411]
                - row [ref=f2e414] [cursor=pointer]:
                  - cell [ref=f2e415]:
                    - checkbox "Select row c3aa5052-fb85-4888-966c-5b9206777e13" [ref=f2e416]
                  - cell "Playwright Test Contact Buyer" [ref=f2e417]:
                    - generic [ref=f2e419]:
                      - generic [ref=f2e420]: Playwright Test Contact
                      - generic [ref=f2e421]: Buyer
                  - cell [ref=f2e422]:
                    - button "Create a customer for this contact" [ref=f2e423]: Unlinked
                  - cell "pw-contact-1789566362949@example.com" [ref=f2e424]
                  - cell "—" [ref=f2e425]
                  - cell "Coimbatore, India" [ref=f2e426]
                  - cell "Active" [ref=f2e427]
                - row [ref=f2e430] [cursor=pointer]:
                  - cell [ref=f2e431]:
                    - checkbox "Select row 0a9b5637-c914-4578-8508-3166c47d3151" [ref=f2e432]
                  - cell "Playwright Test Contact Buyer" [ref=f2e433]:
                    - generic [ref=f2e435]:
                      - generic [ref=f2e436]: Playwright Test Contact
                      - generic [ref=f2e437]: Buyer
                  - cell [ref=f2e438]:
                    - button "Acme Textiles" [ref=f2e439]
                  - cell "pw-contact-1789566358780@example.com" [ref=f2e440]
                  - cell "—" [ref=f2e441]
                  - cell "Coimbatore, India" [ref=f2e442]
                  - cell "Active" [ref=f2e443]
                - row [ref=f2e446] [cursor=pointer]:
                  - cell [ref=f2e447]:
                    - checkbox "Select row 5557e051-6330-4652-9131-8cf716afed9a" [ref=f2e448]
                  - cell "Playwright Test Contact Buyer" [ref=f2e449]:
                    - generic [ref=f2e451]:
                      - generic [ref=f2e452]: Playwright Test Contact
                      - generic [ref=f2e453]: Buyer
                  - cell [ref=f2e454]:
                    - button "Acme Textiles" [ref=f2e455]
                  - cell "pw-contact-1789566282349@example.com" [ref=f2e456]
                  - cell "—" [ref=f2e457]
                  - cell "Coimbatore, India" [ref=f2e458]
                  - cell "Active" [ref=f2e459]
                - row [ref=f2e462] [cursor=pointer]:
                  - cell [ref=f2e463]:
                    - checkbox "Select row 1a3f5050-ab38-4742-a075-67cb5d4ab706" [ref=f2e464]
                  - cell "Playwright Unlinked Contact Buyer" [ref=f2e465]:
                    - generic [ref=f2e467]:
                      - generic [ref=f2e468]: Playwright Unlinked Contact
                      - generic [ref=f2e469]: Buyer
                  - cell [ref=f2e470]:
                    - button "Playwright Test Customer 1789566121857" [ref=f2e471]
                  - cell "pw-unlinked-1789566105173@example.com" [ref=f2e472]
                  - cell "—" [ref=f2e473]
                  - cell "Coimbatore, India" [ref=f2e474]
                  - cell "Active" [ref=f2e475]
                - row [ref=f2e478] [cursor=pointer]:
                  - cell [ref=f2e479]:
                    - checkbox "Select row 41a0ee0b-35e4-42eb-bdd2-a34379b6eea7" [ref=f2e480]
                  - cell "Playwright Unlinked Contact Buyer" [ref=f2e481]:
                    - generic [ref=f2e483]:
                      - generic [ref=f2e484]: Playwright Unlinked Contact
                      - generic [ref=f2e485]: Buyer
                  - cell [ref=f2e486]:
                    - button "Playwright Test Customer 1789565975460" [ref=f2e487]
                  - cell "pw-unlinked-1789565959657@example.com" [ref=f2e488]
                  - cell "—" [ref=f2e489]
                  - cell "Coimbatore, India" [ref=f2e490]
                  - cell "Active" [ref=f2e491]
                - row [ref=f2e494] [cursor=pointer]:
                  - cell [ref=f2e495]:
                    - checkbox "Select row ecb022da-77f4-4146-9ef3-c1c9bab2bcdc" [ref=f2e496]
                  - cell "Playwright Unlinked Contact Buyer" [ref=f2e497]:
                    - generic [ref=f2e499]:
                      - generic [ref=f2e500]: Playwright Unlinked Contact
                      - generic [ref=f2e501]: Buyer
                  - cell [ref=f2e502]:
                    - button "Playwright Test Customer 1789565856223" [ref=f2e503]
                  - cell "pw-unlinked-1789565840081@example.com" [ref=f2e504]
                  - cell "—" [ref=f2e505]
                  - cell "Coimbatore, India" [ref=f2e506]
                  - cell "Active" [ref=f2e507]
                - row [ref=f2e510] [cursor=pointer]:
                  - cell [ref=f2e511]:
                    - checkbox "Select row 0108dd49-73d5-445d-a4c8-64b8684d83e3" [ref=f2e512]
                  - cell "Playwright Handoff Contact Buyer" [ref=f2e513]:
                    - generic [ref=f2e515]:
                      - generic [ref=f2e516]: Playwright Handoff Contact
                      - generic [ref=f2e517]: Buyer
                  - cell [ref=f2e518]:
                    - button "Create a customer for this contact" [ref=f2e519]: Unlinked
                  - cell "pw-handoff-1789565740022@example.com" [ref=f2e520]
                  - cell "—" [ref=f2e521]
                  - cell "Coimbatore, India" [ref=f2e522]
                  - cell "Active" [ref=f2e523]
                - row [ref=f2e526] [cursor=pointer]:
                  - cell [ref=f2e527]:
                    - checkbox "Select row 6d18bf0c-a045-4c8c-a923-0c54fbc1ec09" [ref=f2e528]
                  - cell "Playwright Handoff Contact Buyer" [ref=f2e529]:
                    - generic [ref=f2e531]:
                      - generic [ref=f2e532]: Playwright Handoff Contact
                      - generic [ref=f2e533]: Buyer
                  - cell [ref=f2e534]:
                    - button "Create a customer for this contact" [ref=f2e535]: Unlinked
                  - cell "pw-handoff-1789565473076@example.com" [ref=f2e536]
                  - cell "—" [ref=f2e537]
                  - cell "Coimbatore, India" [ref=f2e538]
                  - cell "Active" [ref=f2e539]
                - row [ref=f2e542] [cursor=pointer]:
                  - cell [ref=f2e543]:
                    - checkbox "Select row d9dc4825-3d3d-4a8b-b56e-43eeb66ccc6b" [ref=f2e544]
                  - cell "Playwright Test Contact Buyer" [ref=f2e545]:
                    - generic [ref=f2e547]:
                      - generic [ref=f2e548]: Playwright Test Contact
                      - generic [ref=f2e549]: Buyer
                  - cell [ref=f2e550]:
                    - button "Playwright Handoff Customer 1789565313180" [ref=f2e551]
                  - cell "pw-contact-1789565346233@example.com" [ref=f2e552]
                  - cell "—" [ref=f2e553]
                  - cell "Coimbatore, India" [ref=f2e554]
                  - cell "Active" [ref=f2e555]
                - row [ref=f2e558] [cursor=pointer]:
                  - cell [ref=f2e559]:
                    - checkbox "Select row 206e6221-528e-4001-8001-406d7f5ffc4a" [ref=f2e560]
                  - cell "Playwright Test Contact Buyer" [ref=f2e561]:
                    - generic [ref=f2e563]:
                      - generic [ref=f2e564]: Playwright Test Contact
                      - generic [ref=f2e565]: Buyer
                  - cell [ref=f2e566]:
                    - button "Create a customer for this contact" [ref=f2e567]: Unlinked
                  - cell "pw-duplicate-1789565313999@example.com" [ref=f2e568]
                  - cell "—" [ref=f2e569]
                  - cell "Coimbatore, India" [ref=f2e570]
                  - cell "Active" [ref=f2e571]
                - row [ref=f2e574] [cursor=pointer]:
                  - cell [ref=f2e575]:
                    - checkbox "Select row 250d9ba2-5848-43a0-aade-a97c3caf595f" [ref=f2e576]
                  - cell "Playwright Test Contact Buyer" [ref=f2e577]:
                    - generic [ref=f2e579]:
                      - generic [ref=f2e580]: Playwright Test Contact
                      - generic [ref=f2e581]: Buyer
                  - cell [ref=f2e582]:
                    - button "Create a customer for this contact" [ref=f2e583]: Unlinked
                  - cell "pw-contact-1789565334241@example.com" [ref=f2e584]
                  - cell "—" [ref=f2e585]
                  - cell "Coimbatore, India" [ref=f2e586]
                  - cell "Active" [ref=f2e587]
            - generic [ref=f2e590]:
              - generic [ref=f2e592]:
                - generic [ref=f2e593]: Showing 1 to 25 of 127
                - generic [ref=f2e594]: ·
                - generic [ref=f2e595]:
                  - generic [ref=f2e596]: "Rows per page:"
                  - combobox "Rows per page" [ref=f2e597] [cursor=pointer]:
                    - generic: "25"
              - generic [ref=f2e598]:
                - button "First page" [disabled] [ref=f2e599]
                - button "Previous page" [disabled] [ref=f2e603]
                - generic [ref=f2e606]: "1"
                - button "Next page" [ref=f2e607] [cursor=pointer]
                - button "Last page" [ref=f2e610] [cursor=pointer]
                - generic [ref=f2e614]:
                  - generic [ref=f2e615]: Go to
                  - textbox "Jump to page (1 to 6)" [ref=f2e616]: "1"
                  - generic [ref=f2e617]: of 6
    - complementary [ref=f2e618]:
      - generic [ref=f2e619]:
        - generic [ref=f2e620]: CRM
        - button [ref=f2e628] [cursor=pointer]
      - navigation [ref=f2e633]:
        - generic [ref=f2e634]:
          - paragraph [ref=f2e635]: Workspace
          - link [ref=f2e636] [cursor=pointer]:
            - /url: /crm/
            - generic [ref=f2e640]: Home
          - link [ref=f2e641] [cursor=pointer]:
            - /url: /crm/customers
            - generic [ref=f2e644]: Customers
          - link [ref=f2e645] [cursor=pointer]:
            - /url: /crm/contacts
            - generic [ref=f2e652]: Contacts
          - link [ref=f2e653] [cursor=pointer]:
            - /url: /crm/social-media-listening
            - generic [ref=f2e660]: Social Media Listening
          - link [ref=f2e661] [cursor=pointer]:
            - /url: /crm/events
            - generic [ref=f2e664]: External Events
          - link [ref=f2e665] [cursor=pointer]:
            - /url: /crm/alerts
            - generic [ref=f2e668]: Alerts
    - status
  - region "Notifications alt+T"
```

# Test source

```ts
  73  |     this.toggleCellFiltersButton = page.getByRole('button', { name: 'Toggle cell filters' });
  74  |     this.configureColumnsButton = page.getByRole('button', { name: 'Configure columns' });
  75  |     this.noSplitButton = page.getByRole('button', { name: 'No split' });
  76  |     this.verticalSplitButton = page.getByRole('button', { name: 'Vertical split' });
  77  |     this.horizontalSplitButton = page.getByRole('button', { name: 'Horizontal split' });
  78  |     this.createContactButton = page.getByRole('button', { name: 'Create Contact' });
  79  |     // exact: true — the Columns dialog also has "More actions for <column>"
  80  |     // buttons per row, which would otherwise substring-match this one.
  81  |     this.moreActionsButton = page.getByRole('button', { name: 'More actions', exact: true });
  82  | 
  83  |     this.addRuleButton = page.getByRole('button', { name: 'Add rule' });
  84  |     // getByRole('button', { name: 'Status' }) also matches the table's own
  85  |     // Status column sort button (confirmed: strict-mode violation). This
  86  |     // one has an explicit aria-label="Status"; the column button's name
  87  |     // comes from its text content instead — getByLabel() only matches the
  88  |     // former.
  89  |     this.statusFilterButton = page.getByLabel('Status', { exact: true });
  90  |     this.countryFilterButton = page.getByRole('button', { name: 'Country', exact: true });
  91  |     this.applyFiltersButton = page.getByRole('button', { name: 'Apply', exact: true });
  92  | 
  93  |     this.columnsDialog = page.getByRole('dialog', { name: 'Columns' });
  94  |     this.columnsSearchInput = this.columnsDialog.getByRole('textbox', { name: 'Search columns' });
  95  |     this.showAllColumnsButton = this.columnsDialog.getByRole('button', { name: 'Show all' });
  96  |     this.hideAllColumnsButton = this.columnsDialog.getByRole('button', { name: 'Hide all' });
  97  |     this.resetColumnsButton = this.columnsDialog.getByRole('button', { name: 'Reset to default' });
  98  |     this.applyColumnsButton = this.columnsDialog.getByRole('button', {
  99  |       name: 'Apply',
  100 |       exact: true,
  101 |     });
  102 |     this.closeColumnsDialogButton = this.columnsDialog.getByRole('button', { name: 'Close' });
  103 | 
  104 |     this.table = page.getByRole('table');
  105 |     this.selectAllRowsCheckbox = page.getByRole('checkbox', { name: 'Select all rows' });
  106 |     // Second rowgroup is the body — the first is the header row.
  107 |     this.dataRows = this.table.getByRole('rowgroup').nth(1).getByRole('row');
  108 |   }
  109 | 
  110 |   async open(): Promise<void> {
  111 |     await this.gotoAuthenticated(CONTACTS_LIST_PATH);
  112 |   }
  113 | 
  114 |   /** The sort button inside a given column's header (not its resize handle). */
  115 |   columnSortButton(columnName: string): Locator {
  116 |     return this.page
  117 |       .getByRole('columnheader', { name: new RegExp(columnName) })
  118 |       .getByRole('button', { name: columnName, exact: true });
  119 |   }
  120 | 
  121 |   columnHeader(columnName: string): Locator {
  122 |     return this.page.getByRole('columnheader', { name: new RegExp(columnName) });
  123 |   }
  124 | 
  125 |   async searchFor(text: string): Promise<void> {
  126 |     await this.searchInput.fill(text);
  127 |   }
  128 | 
  129 |   async openFilters(): Promise<void> {
  130 |     await this.filtersButton.click();
  131 |   }
  132 | 
  133 |   async openConfigureColumns(): Promise<void> {
  134 |     await this.configureColumnsButton.click();
  135 |     await expect(this.columnsDialog).toBeVisible();
  136 |   }
  137 | 
  138 |   /** Toggle a column's visibility checkbox in the Configure Columns dialog. */
  139 |   columnToggle(columnName: string): Locator {
  140 |     return this.columnsDialog.getByRole('checkbox', { name: `Toggle ${columnName}` });
  141 |   }
  142 | 
  143 |   async selectRelationshipTab(tab: 'All' | 'Linked' | 'Unlinked'): Promise<void> {
  144 |     const button = { All: this.allTab, Linked: this.linkedTab, Unlinked: this.unlinkedTab }[tab];
  145 |     await button.click();
  146 |   }
  147 | 
  148 |   async selectLayout(layout: 'No split' | 'Vertical split' | 'Horizontal split'): Promise<void> {
  149 |     const button = {
  150 |       'No split': this.noSplitButton,
  151 |       'Vertical split': this.verticalSplitButton,
  152 |       'Horizontal split': this.horizontalSplitButton,
  153 |     }[layout];
  154 |     await button.click();
  155 |   }
  156 | 
  157 |   async expectLayoutSelected(
  158 |     layout: 'No split' | 'Vertical split' | 'Horizontal split',
  159 |   ): Promise<void> {
  160 |     const button = {
  161 |       'No split': this.noSplitButton,
  162 |       'Vertical split': this.verticalSplitButton,
  163 |       'Horizontal split': this.horizontalSplitButton,
  164 |     }[layout];
  165 |     await expect(button).toHaveAttribute('aria-pressed', 'true');
  166 |   }
  167 | 
  168 |   async selectContactRow(contactName: string): Promise<void> {
  169 |     await this.dataRows.filter({ hasText: contactName }).first().click();
  170 |   }
  171 | 
  172 |   async selectLinkedCustomer(customerName: string): Promise<void> {
> 173 |     await this.page.getByRole('link', { name: customerName }).click();
      |                                                               ^ Error: locator.click: Test timeout of 60000ms exceeded.
  174 |   }
  175 | }
  176 | 
```